from __future__ import annotations

import shutil
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "release"

PACKAGES = [
    ("WebTesterPro-Firefox", "WebTesterPro-Firefox.zip"),
    ("WebTesterPro-Chrome", "WebTesterPro-Chrome.zip"),
    ("WebTesterPro-Source", "WebTesterPro-Source.zip"),
]


def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    return bool(
        {
            ".git",
            ".agents",
            "release",
            "node_modules",
            "__pycache__",
        }
        & parts
    )


def write_zip(source_dir: Path, output: Path) -> None:
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in sorted(source_dir.rglob("*")):
            if not file_path.is_file() or should_skip(file_path):
                continue

            # AMO rejects Windows backslash archive names. as_posix() is required.
            archive_name = file_path.relative_to(source_dir).as_posix()
            archive.write(file_path, archive_name)


def validate_zip(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        bad_names = [name for name in names if "\\" in name]
        if bad_names:
            raise SystemExit(f"{path.name} has invalid backslash paths: {bad_names[:3]}")
        if "manifest.json" not in names:
            raise SystemExit(f"{path.name} is missing manifest.json at archive root")
        archive.testzip()


def main() -> None:
    RELEASE.mkdir(exist_ok=True)

    for source_name, output_name in PACKAGES:
        output = RELEASE / output_name
        if output.exists():
            output.unlink()
        write_zip(ROOT / source_name, output)
        validate_zip(output)
        print(f"built: {output}")

    xpi = RELEASE / "WebTesterPro.xpi"
    shutil.copyfile(RELEASE / "WebTesterPro-Firefox.zip", xpi)
    validate_zip(xpi)
    shutil.copyfile(xpi, ROOT / "WebTesterPro.xpi")
    print(f"built: {xpi}")


if __name__ == "__main__":
    main()
