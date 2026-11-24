#!/bin/bash
# Shim: emulate "blender -b --factory-startup [-P script] [--version] -- args" with the bpy module.
PY=/root/bpyenv/bin/python
script=""; rest=()
while [ $# -gt 0 ]; do
  case "$1" in
    --version) $PY -c "import bpy;print('Blender', bpy.app.version_string)"; exit 0;;
    -b|--background|--factory-startup) shift;;
    -P|--python) script="$2"; shift 2;;
    --) rest=("$@"); break;;
    *) shift;;
  esac
done
exec $PY -c "import sys,bpy,runpy; s=sys.argv[1]; sys.argv=[ 'blender' ]+sys.argv[2:]; runpy.run_path(s, run_name='__main__')" "$script" "${rest[@]}"
