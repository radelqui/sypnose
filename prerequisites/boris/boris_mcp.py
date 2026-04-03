"""
Boris MCP Server v6.2
=====================
MCP server que implementa el flujo Boris completo.
Proporciona herramientas que los agentes LLAMAN naturalmente
y que RECHAZAN operaciones si no se siguen las reglas.

Mejoras v6.2 sobre v6.0:
- _git_cmd usa shell=True para soportar argumentos con espacios
- Detecta git root con rev-parse en vez de os.getcwd()
- boris_verify rechaza evidencia corta (<20 chars how, <15 chars result)
- boris_verify escribe "Estado: APROBADO" para que el prompt hook lo valide
- boris_start_task usa word-boundary matching para evitar falsos positivos
- boris_get_state usa origin/branch en vez de origin/HEAD
- boris_sync usa comillas en commit message
- boris_end_session nuevo tool para cierre limpio

Instalacion:
  pip install mcp pydantic --break-system-packages
  claude mcp add boris --scope user -- python3 ~/.boris/boris_mcp.py
"""

import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

# --- Server -------------------------------------------------------
mcp = FastMCP("boris_mcp")


# --- Helpers -------------------------------------------------------
def _git_root() -> Path:
    """Detecta la raiz del repo git. Fallback: cwd."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return Path(result.stdout.strip())
    except Exception:
        pass
    return Path(os.getcwd())


def _brain_dir() -> Path:
    """Retorna la ruta de .brain/ del proyecto actual."""
    return _git_root() / ".brain"


def _ensure_brain():
    """Crea .brain/ si no existe con archivos base."""
    brain = _brain_dir()
    brain.mkdir(exist_ok=True)
    for f in ["task.md", "session-state.md", "done-registry.md", "history.md"]:
        p = brain / f
        if not p.exists():
            if f == "done-registry.md":
                p.write_text(
                    "# Done Registry\n\n"
                    "## Completado y verificado\n\n"
                    "| Fecha | Tarea | Verificacion | Commit |\n"
                    "|-------|-------|-------------|--------|\n\n"
                    "## Intentado pero fallido\n\n"
                    "| Fecha | Tarea | Por que fallo | Que se necesita |\n"
                    "|-------|-------|--------------|------------------|\n"
                )
            elif f == "task.md":
                p.write_text("# Task\n\nNo hay tarea activa.\n")
            elif f == "session-state.md":
                p.write_text("# Session State\n\nNueva sesion.\n")
            else:
                p.write_text(f"# {f.replace('.md', '').replace('-', ' ').title()}\n\n")


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _git_cmd(cmd: str) -> str:
    """Ejecuta comando git con shell=True para soportar argumentos con espacios."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            timeout=30, cwd=str(_git_root())
        )
        return result.stdout.strip() or result.stderr.strip()
    except Exception as e:
        return f"Error: {e}"


def _task_in_registry(task_name: str, content: str) -> bool:
    """Busca tarea en done-registry con matching exacto por columna.
    Evita falsos positivos: 'fix-modal' NO matchea 'fix-modal-edit-user'.
    Busca el nombre exacto entre pipes de tabla markdown."""
    name_lower = task_name.lower().strip()
    for line in content.lower().split("\n"):
        if "|" not in line:
            continue
        cols = [col.strip() for col in line.split("|")]
        # La columna de tarea es la 3ra (indice 2) en nuestra tabla
        for col in cols:
            if col == name_lower:
                return True
    return False


# --- Tool: Start Task -----------------------------------------------
class StartTaskInput(BaseModel):
    """Iniciar una nueva tarea. LLAMA ESTO PRIMERO antes de hacer cualquier cosa."""
    task_name: str = Field(..., description="Nombre corto de la tarea (ej: 'fix-modal-edit-user')")
    task_description: str = Field(..., description="Descripcion de que hay que hacer")


@mcp.tool(
    name="boris_start_task",
    annotations={
        "title": "Iniciar tarea Boris",
        "readOnlyHint": False,
        "destructiveHint": False,
    },
)
async def boris_start_task(params: StartTaskInput) -> str:
    """
    Inicia una tarea nueva. SIEMPRE llamar esto antes de empezar a trabajar.

    Lo que hace:
    1. Verifica si la tarea ya se hizo (done-registry) -> si si, RECHAZA
    2. Sincroniza con git pull
    3. Crea tag de retorno pre-[tarea]
    4. Guarda estado en .brain/task.md
    5. Retorna contexto completo para continuar
    """
    _ensure_brain()
    brain = _brain_dir()

    # 1. Verificar done-registry con word-boundary matching
    registry = brain / "done-registry.md"
    if registry.exists():
        content = registry.read_text()
        if _task_in_registry(params.task_name, content):
            matching_lines = [
                l for l in content.split("\n")
                if _task_in_registry(params.task_name, l)
            ]
            return (
                f"TAREA YA COMPLETADA: '{params.task_name}' ya esta en done-registry.md.\n"
                f"NO la repitas. Si necesitas modificarla, usa un nombre diferente.\n\n"
                f"Registro existente:\n"
                + "\n".join(matching_lines)
            )

    # 2. Git pull
    pull_result = _git_cmd("git pull --rebase")

    # 3. Tag de retorno (con comillas en el mensaje)
    tag_name = f"pre-{params.task_name}"
    _git_cmd(f'git tag {tag_name} -m "Punto de retorno antes de {params.task_name}"')

    # 4. Guardar estado
    task_md = (
        f"## Tarea actual: {params.task_name}\n"
        f"Inicio: {_now()}\n\n"
        f"## Descripcion\n{params.task_description}\n\n"
        f"## Progreso\n- [ ] En progreso\n\n"
        f"## Proximo paso\nPlanificar antes de codear.\n"
    )
    (brain / "task.md").write_text(task_md)

    state_md = (
        f"## Estado de sesion\n"
        f"Tarea: {params.task_name}\n"
        f"Fase: started\n"
        f"Tag retorno: {tag_name}\n"
        f"Ultima actualizacion: {_now()}\n"
    )
    (brain / "session-state.md").write_text(state_md)

    # 5. Leer contexto existente
    history_tail = ""
    if (brain / "history.md").exists():
        lines = (brain / "history.md").read_text().split("\n")
        history_tail = "\n".join(lines[-10:])

    done_tail = ""
    if registry.exists():
        lines = registry.read_text().split("\n")
        table_lines = [l for l in lines if l.startswith("|") and "Fecha" not in l and "---" not in l]
        done_tail = "\n".join(table_lines[-5:])

    return (
        f"Tarea '{params.task_name}' iniciada.\n\n"
        f"Tag de retorno: {tag_name}\n"
        f"Git pull: {pull_result}\n\n"
        f"Ultimas tareas completadas:\n{done_tail}\n\n"
        f"Historial reciente:\n{history_tail}\n\n"
        f"SIGUIENTE PASO: Planifica antes de codear.\n"
        f"- Simple (1-2 archivos): Plan Mode\n"
        f"- Medio (3-10): /gsd:plan-phase\n"
        f"- Complejo (10+): /gsd:discuss-phase -> plan-phase\n"
        f"- Bug: superpowers:systematic-debugging (4 fases)\n"
        f"- Feature nueva: superpowers:brainstorming (HARD GATE)\n"
    )


# --- Tool: Save State -----------------------------------------------
class SaveStateInput(BaseModel):
    """Guardar progreso actual. Llamar cada 15-20 min o despues de cada hito."""
    progress: str = Field(..., description="Que has completado hasta ahora")
    next_step: str = Field(..., description="Que vas a hacer a continuacion")
    files_modified: Optional[str] = Field(None, description="Archivos modificados")


@mcp.tool(
    name="boris_save_state",
    annotations={
        "title": "Guardar estado Boris",
        "readOnlyHint": False,
        "destructiveHint": False,
    },
)
async def boris_save_state(params: SaveStateInput) -> str:
    """
    Guarda tu progreso en .brain/ para sobrevivir al reset de contexto.
    LLAMA ESTO cada 15-20 minutos o despues de cada hito importante.
    """
    _ensure_brain()
    brain = _brain_dir()

    branch = _git_cmd("git branch --show-current")
    last_commit = _git_cmd("git log -1 --oneline")
    uncommitted = _git_cmd("git status --porcelain")

    files = params.files_modified or _git_cmd("git diff --name-only")

    n_uncommitted = len([l for l in uncommitted.split("\n") if l.strip()]) if uncommitted else 0

    state = (
        f"## Estado de sesion\n"
        f"Ultima actualizacion: {_now()}\n"
        f"Fase: executing\n"
        f"Branch: {branch}\n"
        f"Ultimo commit: {last_commit}\n"
        f"Archivos sin commit: {n_uncommitted}\n\n"
        f"## Progreso\n{params.progress}\n\n"
        f"## Proximo paso\n{params.next_step}\n\n"
        f"## Archivos modificados\n{files}\n"
    )
    (brain / "session-state.md").write_text(state)

    # Actualizar task.md con progreso
    task = brain / "task.md"
    if task.exists():
        content = task.read_text()
        if "## Progreso actual" in content:
            content = content.split("## Progreso actual")[0]
        content += f"\n## Progreso actual\n{params.progress}\n\n## Proximo paso\n{params.next_step}\n"
        task.write_text(content)

    return (
        f"Estado guardado en .brain/ ({_now()})\n"
        f"Si tu contexto se resetea, llama boris_get_state para continuar."
    )


# --- Tool: Get State ------------------------------------------------
@mcp.tool(
    name="boris_get_state",
    annotations={
        "title": "Obtener estado Boris",
        "readOnlyHint": True,
    },
)
async def boris_get_state() -> str:
    """
    Recupera el estado completo del proyecto.
    LLAMA ESTO al inicio de cada sesion o despues de un reset de contexto.
    Te dice: que estabas haciendo, donde quedaste, que ya se hizo.
    """
    _ensure_brain()
    brain = _brain_dir()

    result = []

    # Task actual
    task = brain / "task.md"
    if task.exists() and "No hay tarea activa" not in task.read_text():
        result.append("=== TAREA ACTUAL ===")
        result.append(task.read_text()[:2000])

    # Session state
    state = brain / "session-state.md"
    if state.exists() and "Nueva sesion" not in state.read_text():
        result.append("\n=== ESTADO DE SESION ===")
        result.append(state.read_text()[:1000])

    # Done registry (ultimas 10 lineas con datos)
    registry = brain / "done-registry.md"
    if registry.exists():
        lines = [
            l for l in registry.read_text().split("\n")
            if l.startswith("|") and "Fecha" not in l and "---" not in l
        ]
        if lines:
            result.append("\n=== ULTIMAS TAREAS COMPLETADAS ===")
            result.append("\n".join(lines[-10:]))

    # Git status
    branch = _git_cmd("git branch --show-current")
    uncommitted = _git_cmd("git status --porcelain")
    if uncommitted:
        n = len([l for l in uncommitted.split("\n") if l.strip()])
        result.append(f"\n=== ARCHIVOS SIN COMMIT ({n}) ===")
        result.append(uncommitted[:500])

    # Commits sin push (usa branch actual, no origin/HEAD)
    if branch:
        unpushed = _git_cmd(f"git log origin/{branch}..HEAD --oneline 2>/dev/null")
        if unpushed and "Error" not in unpushed and "fatal" not in unpushed:
            result.append(f"\n=== COMMITS SIN PUSH ===")
            result.append(unpushed[:300])

    result.append(f"\nBranch: {branch}")
    result.append(f"Ultimo commit: {_git_cmd('git log -1 --oneline')}")

    if not result:
        return "No hay estado guardado. Usa boris_start_task para iniciar una tarea."

    return "\n".join(result)


# --- Tool: Verify ---------------------------------------------------
class VerifyInput(BaseModel):
    """Registrar evidencia de verificacion. OBLIGATORIO antes de commit."""
    what_changed: str = Field(..., description="Que cambiaste (ej: 'Modal de editar usuario')")
    how_verified: str = Field(..., description="COMO lo verificaste (min 20 chars). Ej: 'Abri Chrome, navegue a /users, clickee Edit, modal abre correctamente'")
    result: str = Field(..., description="Resultado CONCRETO (min 15 chars). Ej: 'PUT /api/users/1 -> 200 OK, datos actualizados en BD'")


@mcp.tool(
    name="boris_verify",
    annotations={
        "title": "Registrar verificacion Boris",
        "readOnlyHint": False,
        "destructiveHint": False,
    },
)
async def boris_verify(params: VerifyInput) -> str:
    """
    Registra evidencia de verificacion. DEBES llamar esto ANTES de hacer git commit.
    El hook bloquea el commit si no existe .brain/last-verification.md con APROBADO.

    RECHAZA si la evidencia no es especifica o es demasiado corta.
    """
    # Check estructural 1: how_verified debe referenciar un target específico O describir un resultado
    # Acepta: URLs, puertos, rutas de archivo, o mención de un resultado con flecha/keyword
    has_specific_target = bool(re.search(
        r'(localhost:\d+|https?://\S+|/[a-z0-9_\-./]{3,}|\b\d{4,5}\b)',
        params.how_verified, re.IGNORECASE
    ))
    has_result_mention = bool(re.search(
        r'(->|→|returns?|retorna|devuelve|shows?|muestra|respond|output|exit|status|result)',
        params.how_verified, re.IGNORECASE
    ))

    if len(params.how_verified) < 40 or not (has_specific_target or has_result_mention):
        return (
            "EVIDENCIA RECHAZADA.\n\n"
            "Describe qué ejecutaste y qué respondió. Sé específico.\n"
        )

    # Check estructural 2: result debe tener patrones de output real, no prosa
    # Detecta: conteos de tests, exit codes, HTTP status, PIDs, timing, JSON, columnas
    has_real_output = bool(re.search(
        r'(\d+\s*(?:passed|failed|errors?|warnings?|found|changed|inserted|updated|deleted)'
        r'|exit\s*(?:code\s*)?:?\s*\d+'
        r'|\b[2345]\d{2}\s+\w+'
        r'|active\s*\(running\)'
        r'|\bpid\s*:?\s*\d{3,}'
        r'|\d+\.\d+\s*s(?:ec)?'
        r'|[{}\[\]].*[{}\[\]]'
        r'|\d+\s+\d+\s+\d+)',
        params.result, re.IGNORECASE
    ))

    if not has_real_output:
        return (
            "RESULTADO RECHAZADO.\n\n"
            "Pega el output del comando, no lo parafrasees.\n"
        )

    # Checks de longitud mínima
    if len(params.how_verified) < 40:
        return (
            "EVIDENCIA DEMASIADO CORTA.\n"
            "Describe concretamente cómo verificaste (min 40 caracteres).\n"
        )

    if len(params.result) < 15:
        return (
            "RESULTADO DEMASIADO CORTO.\n"
            "Incluye el output concreto (min 15 caracteres).\n"
        )

    _ensure_brain()
    brain = _brain_dir()

    # Escribir con timestamp y Estado: APROBADO para que el hook lo valide
    evidence = (
        f"## Verificacion APROBADA por Boris MCP\n"
        f"Fecha: {_now()}\n"
        f"Cambio: {params.what_changed}\n"
        f"Como verificado: {params.how_verified}\n"
        f"Resultado: {params.result}\n"
        f"Estado: APROBADO\n"
    )
    (brain / "last-verification.md").write_text(evidence)

    return (
        f"Verificacion registrada y APROBADA.\n"
        f"Ahora puedes hacer git commit.\n"
        f"El hook permitira el commit porque existe .brain/last-verification.md con Estado: APROBADO."
    )


# --- Tool: Register Done --------------------------------------------
class RegisterDoneInput(BaseModel):
    """Registrar tarea completada en done-registry."""
    task_name: str = Field(..., description="Nombre de la tarea completada")
    verification_summary: str = Field(..., description="Resumen de como se verifico")
    commit_hash: Optional[str] = Field(None, description="Hash del commit (se auto-detecta si no se pasa)")


@mcp.tool(
    name="boris_register_done",
    annotations={
        "title": "Registrar tarea completada",
        "readOnlyHint": False,
        "destructiveHint": False,
    },
)
async def boris_register_done(params: RegisterDoneInput) -> str:
    """
    Registra una tarea como COMPLETADA en done-registry.md.
    Llama esto DESPUES de commit + push.
    Esto evita que la tarea se repita en el futuro.
    """
    _ensure_brain()
    brain = _brain_dir()

    commit = params.commit_hash or _git_cmd("git log -1 --format=%h")

    registry = brain / "done-registry.md"
    content = registry.read_text() if registry.exists() else ""

    line = f"| {_now()} | {params.task_name} | {params.verification_summary} | {commit} |"

    if "## Completado y verificado" in content:
        # Insertar antes de "## Intentado pero fallido"
        if "## Intentado pero fallido" in content:
            parts = content.split("## Intentado pero fallido")
            parts[0] = parts[0].rstrip() + f"\n{line}\n\n"
            content = "## Intentado pero fallido".join(parts)
        else:
            content = content.rstrip() + f"\n{line}\n"
    else:
        content += f"\n{line}\n"

    registry.write_text(content)

    # Limpiar task.md
    (brain / "task.md").write_text("# Task\n\nNo hay tarea activa.\n")

    # Limpiar last-verification.md (ya se uso)
    lv = brain / "last-verification.md"
    if lv.exists():
        lv.unlink()

    # Actualizar history.md
    history = brain / "history.md"
    hist_content = history.read_text() if history.exists() else "# History\n\n"
    hist_content += (
        f"\n### {_now()} -- {params.task_name}\n"
        f"Completada. Commit: {commit}\n"
        f"Verificacion: {params.verification_summary}\n"
    )
    history.write_text(hist_content)

    return (
        f"Tarea '{params.task_name}' registrada como COMPLETADA.\n"
        f"Commit: {commit}\n"
        f"No se repetira en el futuro.\n\n"
        f"Ahora: git push para sincronizar."
    )


# --- Tool: Register Failed ------------------------------------------
class RegisterFailedInput(BaseModel):
    """Registrar tarea que fallo para evitar repetir el mismo approach."""
    task_name: str = Field(..., description="Nombre de la tarea")
    why_failed: str = Field(..., description="Por que fallo")
    what_needed: str = Field(..., description="Que se necesita para que funcione")


@mcp.tool(
    name="boris_register_failed",
    annotations={
        "title": "Registrar tarea fallida",
        "readOnlyHint": False,
        "destructiveHint": False,
    },
)
async def boris_register_failed(params: RegisterFailedInput) -> str:
    """
    Registra una tarea que FALLO en done-registry.md.
    Esto evita que se repita el mismo approach que ya fallo.
    """
    _ensure_brain()
    brain = _brain_dir()

    registry = brain / "done-registry.md"
    content = registry.read_text() if registry.exists() else ""

    line = f"| {_now()} | {params.task_name} | {params.why_failed} | {params.what_needed} |"

    # Insertar al final (despues de la seccion de fallidos)
    content = content.rstrip() + f"\n{line}\n"
    registry.write_text(content)

    return (
        f"Tarea '{params.task_name}' registrada como FALLIDA.\n"
        f"Razon: {params.why_failed}\n"
        f"Se necesita: {params.what_needed}\n\n"
        f"Proximos agentes veran esto y no repetiran el mismo approach."
    )


# --- Tool: Sync -----------------------------------------------------
class SyncInput(BaseModel):
    """Sincronizar con git."""
    direction: str = Field("both", description="'pull', 'push', o 'both'")


@mcp.tool(
    name="boris_sync",
    annotations={
        "title": "Sincronizar git",
        "readOnlyHint": False,
    },
)
async def boris_sync(params: SyncInput) -> str:
    """
    Sincroniza el proyecto con git.
    'pull' al empezar, 'push' despues de commit, 'both' para full sync.
    """
    results = []

    if params.direction in ("pull", "both"):
        results.append(f"Pull: {_git_cmd('git pull --rebase')}")

    if params.direction in ("push", "both"):
        # Commit .brain/ antes de push (con comillas en el mensaje)
        brain_changes = _git_cmd("git status --porcelain .brain/")
        if brain_changes:
            _git_cmd("git add .brain/")
            _git_cmd('git commit -m "state: boris sync"')
        results.append(f"Push: {_git_cmd('git push')}")

    return "\n".join(results) or "Direccion no valida. Usa 'pull', 'push', o 'both'."


# --- Tool: Health ----------------------------------------------------
@mcp.tool(
    name="boris_health",
    annotations={
        "title": "Health check del proyecto",
        "readOnlyHint": True,
    },
)
async def boris_health() -> str:
    """
    Verifica la salud del proyecto actual.
    Reporta: archivos sin commit, commits sin push, estado de .brain/,
    y si hay verificaciones pendientes.
    """
    brain = _brain_dir()
    results = []

    # Git status
    uncommitted = _git_cmd("git status --porcelain")
    n_uncommitted = len([l for l in uncommitted.split("\n") if l.strip()]) if uncommitted else 0
    results.append(f"Archivos sin commit: {n_uncommitted}")

    # Commits sin push (usa branch actual)
    branch = _git_cmd("git branch --show-current")
    if branch:
        unpushed = _git_cmd(f"git log origin/{branch}..HEAD --oneline 2>/dev/null")
        if unpushed and "Error" not in unpushed and "fatal" not in unpushed:
            n_unpushed = len([l for l in unpushed.split("\n") if l.strip()])
            results.append(f"Commits sin push: {n_unpushed}")
        else:
            results.append("Commits sin push: 0 (o sin remote tracking)")

    # .brain/ status
    if brain.exists():
        task = brain / "task.md"
        if task.exists() and "No hay tarea activa" not in task.read_text():
            # Extraer nombre de la tarea
            task_content = task.read_text()
            task_line = [l for l in task_content.split("\n") if "Tarea actual:" in l]
            task_name = task_line[0].split(":")[-1].strip() if task_line else "ver task.md"
            results.append(f"Tarea activa: SI -- {task_name}")
        else:
            results.append("Tarea activa: No")

        verification = brain / "last-verification.md"
        if verification.exists():
            v_content = verification.read_text()
            if "APROBADO" in v_content:
                results.append("Verificacion: APROBADA (puede hacer commit)")
            else:
                results.append("Verificacion: existe pero sin APROBADO")
        else:
            results.append("Verificacion pendiente: No")
    else:
        results.append(".brain/ no existe -- llama boris_start_task")

    # Branch info
    results.append(f"Branch: {branch}")
    results.append(f"Ultimo commit: {_git_cmd('git log -1 --oneline')}")

    return "\n".join(results)


# --- Run -------------------------------------------------------------
if __name__ == "__main__":
    mcp.run()
