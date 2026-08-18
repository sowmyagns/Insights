import pathlib
import py_compile

root = pathlib.Path('app')
for p in sorted(root.rglob('*.py')):
    try:
        py_compile.compile(str(p), doraise=True)
    except Exception as e:
        print('FAIL:', p)
        print(type(e).__name__, e)
