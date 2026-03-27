#!/usr/bin/env python3
"""
Consolidate repository files into a single markdown file.
Walks through all files, skips common directories, and includes code files with proper formatting.
"""

import os
import sys
from pathlib import Path
from typing import Set, List, Dict

# Directories to skip
SKIP_DIRS = {
    '.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build',
    '.idea', '.vscode', '.next', 'coverage', '.turbo', '.cache'
}

# File extensions to include
INCLUDE_EXTENSIONS = {
    '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h',
    '.go', '.rs', '.rb', '.php', '.html', '.css', '.json', '.yaml',
    '.yml', '.md', '.txt', '.sql', '.sh', '.toml', '.lock', '.config'
}

# Map extensions to code block language tags
LANGUAGE_MAP = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'jsx',
    '.tsx': 'tsx',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.txt': 'text',
    '.sql': 'sql',
    '.sh': 'bash',
    '.toml': 'toml',
    '.lock': 'text',
    '.config': 'text',
}


def should_skip_dir(dir_name: str) -> bool:
    """Check if directory should be skipped."""
    return dir_name in SKIP_DIRS


def should_include_file(file_path: Path) -> bool:
    """Check if file should be included based on extension."""
    return file_path.suffix in INCLUDE_EXTENSIONS


def get_language_tag(file_path: Path) -> str:
    """Get the language tag for code block based on file extension."""
    return LANGUAGE_MAP.get(file_path.suffix, 'text')


def generate_tree_structure(root_path: Path, prefix: str = "", skip_dirs: Set[str] = SKIP_DIRS) -> List[str]:
    """Generate a tree structure of the directory."""
    tree_lines = []

    try:
        items = sorted(root_path.iterdir(), key=lambda x: (not x.is_dir(), x.name))
        dirs = [item for item in items if item.is_dir() and item.name not in skip_dirs]
        files = [item for item in items if item.is_file() and should_include_file(item)]

        all_items = dirs + files

        for idx, item in enumerate(all_items):
            is_last = idx == len(all_items) - 1
            current_prefix = "└── " if is_last else "├── "
            tree_lines.append(f"{prefix}{current_prefix}{item.name}")

            if item.is_dir():
                extension_prefix = "    " if is_last else "│   "
                tree_lines.extend(generate_tree_structure(item, prefix + extension_prefix, skip_dirs))
    except PermissionError:
        pass

    return tree_lines


def consolidate_repo(repo_path: str, output_file: str):
    """Main function to consolidate repository into a single markdown file."""
    repo_path = Path(repo_path).resolve()
    output_path = repo_path / output_file

    print(f"Consolidating repository: {repo_path}")
    print(f"Output file: {output_path}")

    # Collect all files to process
    files_to_process: List[tuple] = []

    for root, dirs, files in os.walk(repo_path):
        # Remove skip directories from dirs list (modifies in-place to prevent descent)
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]

        root_path = Path(root)
        for file in files:
            file_path = root_path / file
            if should_include_file(file_path):
                # Calculate relative path for display
                try:
                    rel_path = file_path.relative_to(repo_path)
                    files_to_process.append((file_path, rel_path))
                except ValueError:
                    continue

    # Sort files by path for consistent output
    files_to_process.sort(key=lambda x: str(x[1]))

    print(f"Found {len(files_to_process)} files to process")

    # Write output
    with open(output_path, 'w', encoding='utf-8') as out:
        # Write header
        out.write("# Repository Consolidation\n\n")
        out.write(f"Repository: {repo_path.name}\n\n")
        out.write(f"Total files included: {len(files_to_process)}\n\n")

        # Write tree structure
        out.write("## Directory Structure\n\n")
        out.write("```\n")
        out.write(f"{repo_path.name}/\n")
        tree_lines = generate_tree_structure(repo_path, "", SKIP_DIRS)
        for line in tree_lines:
            out.write(f"{line}\n")
        out.write("```\n\n")

        # Write table of contents
        out.write("## Table of Contents\n\n")
        for idx, (_, rel_path) in enumerate(files_to_process, 1):
            # Create anchor from path
            anchor = str(rel_path).replace('/', '-').replace('.', '').replace(' ', '-').lower()
            out.write(f"{idx}. [{rel_path}](#{anchor})\n")
        out.write("\n---\n\n")

        # Write each file
        out.write("## Files\n\n")
        successful = 0
        failed = 0

        for file_path, rel_path in files_to_process:
            try:
                # Read file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Write file section
                out.write(f"### {rel_path}\n\n")
                out.write(f"**Path:** `{rel_path}`\n\n")

                # Get language tag
                lang_tag = get_language_tag(file_path)

                # Write content in code block
                out.write(f"```{lang_tag}\n")
                out.write(content)
                if not content.endswith('\n'):
                    out.write('\n')
                out.write("```\n\n")
                out.write("---\n\n")

                successful += 1

            except UnicodeDecodeError:
                # Try with binary read and skip if it's truly binary
                try:
                    with open(file_path, 'rb') as f:
                        content_bytes = f.read()
                    # Try latin-1 encoding as fallback
                    content = content_bytes.decode('latin-1')

                    out.write(f"### {rel_path}\n\n")
                    out.write(f"**Path:** `{rel_path}`\n\n")
                    out.write("*Note: File encoding handled with latin-1 fallback*\n\n")

                    lang_tag = get_language_tag(file_path)
                    out.write(f"```{lang_tag}\n")
                    out.write(content)
                    if not content.endswith('\n'):
                        out.write('\n')
                    out.write("```\n\n")
                    out.write("---\n\n")

                    successful += 1
                except Exception as e:
                    out.write(f"### {rel_path}\n\n")
                    out.write(f"**Path:** `{rel_path}`\n\n")
                    out.write(f"*Error: Could not read file - {str(e)}*\n\n")
                    out.write("---\n\n")
                    failed += 1
                    print(f"Failed to read {rel_path}: {e}")

            except Exception as e:
                out.write(f"### {rel_path}\n\n")
                out.write(f"**Path:** `{rel_path}`\n\n")
                out.write(f"*Error: Could not read file - {str(e)}*\n\n")
                out.write("---\n\n")
                failed += 1
                print(f"Failed to read {rel_path}: {e}")

        # Write summary
        out.write("## Summary\n\n")
        out.write(f"- Total files processed: {len(files_to_process)}\n")
        out.write(f"- Successfully included: {successful}\n")
        out.write(f"- Failed to read: {failed}\n")

    print(f"\nConsolidation complete!")
    print(f"Successfully processed: {successful}/{len(files_to_process)} files")
    if failed > 0:
        print(f"Failed: {failed} files")
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    # Use current directory or provided path
    repo_path = sys.argv[1] if len(sys.argv) > 1 else "."
    output_file = "repo-consolidated.md"

    consolidate_repo(repo_path, output_file)
