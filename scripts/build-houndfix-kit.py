#!/usr/bin/env python3
"""Emit the HoundFix desktop kit and zip from the web catalog."""
from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path

ROOT = Path("/workspace")
TOOLS_TS = ROOT / "src/data/tools.ts"
KIT = ROOT / "toolkit/houndfix"
WIN = KIT / "scripts/windows"
OUT_ZIP = ROOT / "public/downloads/HoundFix-2.0.zip"

CATEGORIES = [
    ("network", "Network"),
    ("print", "Print"),
    ("cleanup", "Cleanup"),
    ("repair", "Repair"),
    ("diagnose", "Diagnose"),
    ("power", "Power tools"),
]


def parse_tools(src: str) -> list[dict]:
    blocks = re.findall(r"\{[^{}]*id: \"([^\"]+)\"[^{}]*script: `([^`]*)`[^{}]*\}", src, re.S)
    # fallback more robust parse
    tools = []
    parts = src.split("{\n    id:")
    for part in parts[1:]:
        def field(name: str) -> str:
            m = re.search(rf'{name}: "([^"]*)"', part)
            return m.group(1) if m else ""

        def flag(name: str) -> bool:
            m = re.search(rf"{name}: (true|false)", part)
            return bool(m and m.group(1) == "true")

        sm = re.search(r"script: `([^`]*)`", part, re.S)
        tools.append(
            {
                "id": field("id") or part.split('"')[1],
                "name": field("name"),
                "summary": field("summary"),
                "category": field("category"),
                "admin": flag("admin"),
                "file": field("file"),
                "script": sm.group(1).strip() if sm else "",
            }
        )
    return [t for t in tools if t["file"]]


def main() -> None:
    WIN.mkdir(parents=True, exist_ok=True)
    tools = parse_tools(TOOLS_TS.read_text())
    (KIT / "tools.json").write_text(json.dumps(tools, indent=2), encoding="utf-8")
    for t in tools:
        (WIN / t["file"]).write_text(t["script"] + "\n", encoding="utf-8")

    (KIT / "requirements.txt").write_text("# HoundFix uses the Python standard library only.\n", encoding="utf-8")
    (KIT / "LICENSE").write_text(LICENSE, encoding="utf-8")
    (KIT / "README.md").write_text(README, encoding="utf-8")
    (KIT / "build.bat").write_text(BUILD_BAT, encoding="utf-8")
    (KIT / "main.py").write_text(MAIN_PY, encoding="utf-8")

    logo = ROOT / "public/brand/logo.png"
    if logo.exists():
        (KIT / "assets").mkdir(exist_ok=True)
        (KIT / "assets" / "logo.png").write_bytes(logo.read_bytes())

    OUT_ZIP.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in KIT.rglob("*"):
            if path.is_file():
                zf.write(path, Path("HoundFix-2.0") / path.relative_to(KIT))
    print(f"wrote {len(tools)} scripts -> {OUT_ZIP} ({OUT_ZIP.stat().st_size} bytes)")


LICENSE = """MIT License

Copyright (c) 2026 Two Hounds Run

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

README = """# HoundFix 2.0

IT toolkit from **Two Hounds Run**. Formerly QuickFix.

Practical Windows repairs you can run from a desktop app or paste into PowerShell.

## Run (users)

1. Unzip `HoundFix-2.0`.
2. Install Python 3.10+ if needed (`python.org`) and tick **Add Python to PATH**.
3. Double-click `main.py`, or from a terminal:

```
python main.py
```

4. For network reset, printers, DISM, restore points: right-click → **Run as administrator**.

Logs live in `Documents\\HoundFix\\logs\\`.

## Build a portable EXE (optional)

```
pip install pyinstaller
build.bat
```

`dist\\HoundFix.exe` is the portable build. Windows Defender often flags unsigned PyInstaller binaries — sign before a public store listing.

## What is in the box

| Folder | Contents |
| --- | --- |
| `main.py` | Desktop app |
| `tools.json` | Catalog |
| `scripts/windows` | One `.ps1` per repair |
| `assets/logo.png` | Two Hounds mark |

## Safety

Scripts change system state. Create a restore point first (included). Two Hounds Run is not liable for data loss. MIT licensed.

Version 2.0.0 · Windows 10/11 · Two Hounds Run
"""

BUILD_BAT = r"""@echo off
pyinstaller --noconfirm --onefile --windowed --name HoundFix --add-data "scripts;scripts" --add-data "tools.json;." --add-data "assets;assets" main.py
echo Built dist\HoundFix.exe
"""

MAIN_PY = r'''"""HoundFix 2.0 — Two Hounds Run IT toolkit."""
from __future__ import annotations

import ctypes
import json
import os
import subprocess
import sys
import threading
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import messagebox, scrolledtext, ttk

__version__ = "2.0.0"
IS_WINDOWS = os.name == "nt"
ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
NAVY = "#071428"
SURFACE = "#0c1d38"
ELEVATED = "#122544"
FG = "#f4f7fb"
MUTED = "#93a4bb"
BLUE = "#2f6fed"
ICE = "#5eb0ff"


def load_tools():
    path = ROOT / "tools.json"
    if not path.exists():
        path = Path(__file__).resolve().parent / "tools.json"
    return json.loads(path.read_text(encoding="utf-8"))


class HoundFix:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"HoundFix {__version__} — Two Hounds Run")
        self.root.geometry("920x720")
        self.root.configure(bg=NAVY)
        self.docs = Path.home() / "Documents" / "HoundFix"
        self.logs = self.docs / "logs"
        self.logs.mkdir(parents=True, exist_ok=True)
        self.is_admin = self._admin()
        self.tools = load_tools()
        self._header()
        self._tabs()
        self._log_panel()
        self.log("HoundFix started")
        if IS_WINDOWS and not self.is_admin:
            self.log("Standard user — elevate for full kit", "WARN")
        if not IS_WINDOWS:
            self.log("Not Windows — copy scripts from the HoundFix site instead", "WARN")

    def _admin(self) -> bool:
        if not IS_WINDOWS:
            return False
        try:
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False

    def log(self, message: str, level: str = "INFO"):
        line = f"[{datetime.now():%H:%M:%S}] {level}: {message}\n"
        try:
            self.log_text.insert("end", line)
            self.log_text.see("end")
        except Exception:
            pass
        with open(self.logs / f"houndfix_{datetime.now():%Y%m%d}.log", "a", encoding="utf-8") as fh:
            fh.write(line)

    def _header(self):
        bar = tk.Frame(self.root, bg=NAVY, height=88)
        bar.pack(fill="x")
        bar.pack_propagate(False)
        tk.Label(bar, text="HOUNDFIX", font=("Segoe UI", 22, "bold"), bg=NAVY, fg=FG).pack(
            side="left", padx=20, pady=16
        )
        tk.Label(
            bar, text="TWO HOUNDS RUN", font=("Segoe UI", 10, "bold"), bg=NAVY, fg=BLUE
        ).pack(side="left")
        status = "Admin" if self.is_admin else ("Standard" if IS_WINDOWS else "Not Windows")
        color = "#3dd68c" if self.is_admin else "#e7b549"
        tk.Label(bar, text=status, bg=color, fg=NAVY, font=("Segoe UI", 9, "bold"), padx=10, pady=4).pack(
            side="right", padx=20
        )

    def _tabs(self):
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("TNotebook", background=SURFACE, borderwidth=0)
        style.configure("TNotebook.Tab", background=ELEVATED, foreground=FG, padding=(14, 8))
        style.map("TNotebook.Tab", background=[("selected", BLUE)])
        nb = ttk.Notebook(self.root)
        nb.pack(fill="both", expand=True, padx=12, pady=8)
        groups = {}
        for tool in self.tools:
            groups.setdefault(tool["category"], []).append(tool)
        labels = {
            "network": "Network",
            "print": "Print",
            "cleanup": "Cleanup",
            "repair": "Repair",
            "diagnose": "Diagnose",
            "power": "Power",
        }
        for key, title in labels.items():
            frame = tk.Frame(nb, bg=SURFACE)
            nb.add(frame, text=title)
            for i, tool in enumerate(groups.get(key, [])):
                self._card(frame, tool, i)

    def _card(self, parent, tool, index):
        row, col = divmod(index, 2)
        parent.grid_columnconfigure(0, weight=1)
        parent.grid_columnconfigure(1, weight=1)
        card = tk.Frame(parent, bg=ELEVATED, padx=12, pady=12)
        card.grid(row=row, column=col, sticky="nsew", padx=8, pady=8)
        name = tool["name"] + ("  · admin" if tool.get("admin") else "")
        tk.Label(card, text=name, bg=ELEVATED, fg=FG, font=("Segoe UI", 11, "bold"), anchor="w").pack(fill="x")
        tk.Label(
            card, text=tool["summary"], bg=ELEVATED, fg=MUTED, wraplength=340, justify="left", anchor="w"
        ).pack(fill="x", pady=(4, 8))
        tk.Button(
            card,
            text="Run",
            bg=BLUE,
            fg=FG,
            relief="flat",
            padx=16,
            pady=6,
            command=lambda t=tool: threading.Thread(target=self.run_tool, args=(t,), daemon=True).start(),
        ).pack(anchor="w")

    def _log_panel(self):
        wrap = tk.Frame(self.root, bg=NAVY)
        wrap.pack(fill="both", padx=12, pady=(0, 12))
        tk.Label(wrap, text="Activity", bg=NAVY, fg=FG, anchor="w").pack(fill="x")
        self.log_text = scrolledtext.ScrolledText(
            wrap, height=8, bg="#050b16", fg=ICE, insertbackground=FG, font=("Consolas", 9)
        )
        self.log_text.pack(fill="both")

    def run_tool(self, tool):
        if not IS_WINDOWS:
            self.root.after(0, lambda: messagebox.showinfo("HoundFix", "Windows only. Copy the script from the site."))
            return
        script_path = ROOT / "scripts" / "windows" / tool["file"]
        if not script_path.exists():
            script_path = Path(__file__).resolve().parent / "scripts" / "windows" / tool["file"]
        self.log(f"Running {tool['name']}")
        try:
            proc = subprocess.run(
                ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", str(script_path)],
                capture_output=True,
                text=True,
            )
        except Exception as exc:
            self.log(str(exc), "ERROR")
            self.root.after(0, lambda: messagebox.showerror("HoundFix", str(exc)))
            return
        out = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode == 0:
            self.log(f"OK {tool['name']}")
            if out.strip():
                self.log(out.strip()[:800])
            self.root.after(0, lambda: messagebox.showinfo("HoundFix", f"{tool['name']} finished."))
        else:
            self.log(out.strip() or f"exit {proc.returncode}", "ERROR")
            self.root.after(0, lambda: messagebox.showerror("HoundFix", out[:400] or "Failed"))


def main():
    root = tk.Tk()
    HoundFix(root)
    root.mainloop()


if __name__ == "__main__":
    main()
'''


if __name__ == "__main__":
    main()
