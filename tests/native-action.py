"""Native mouse input and screenshots for the isolated Linux Xvfb test display."""
import ctypes as c
from ctypes.util import find_library
import os,sys,time
if sys.argv[1]=='screenshot':
    from PIL import ImageGrab
    ImageGrab.grab(xdisplay=os.environ['DISPLAY']).save(sys.argv[2])
    raise SystemExit(0)
x=c.CDLL(find_library('X11'));t=c.CDLL(find_library('Xtst'))
x.XOpenDisplay.argtypes=[c.c_char_p];x.XOpenDisplay.restype=c.c_void_p
x.XFlush.argtypes=[c.c_void_p];x.XCloseDisplay.argtypes=[c.c_void_p]
t.XTestFakeMotionEvent.argtypes=[c.c_void_p,c.c_int,c.c_int,c.c_int,c.c_ulong]
t.XTestFakeButtonEvent.argtypes=[c.c_void_p,c.c_uint,c.c_int,c.c_ulong]
d=x.XOpenDisplay(os.environ['DISPLAY'].encode())
if not d: raise RuntimeError('Cannot open the isolated test display')
if sys.argv[1]=='key':
    x.XStringToKeysym.argtypes=[c.c_char_p];x.XStringToKeysym.restype=c.c_ulong
    x.XKeysymToKeycode.argtypes=[c.c_void_p,c.c_ulong];x.XKeysymToKeycode.restype=c.c_uint
    t.XTestFakeKeyEvent.argtypes=[c.c_void_p,c.c_uint,c.c_int,c.c_ulong]
    key=x.XKeysymToKeycode(d,x.XStringToKeysym(sys.argv[2].encode()))
    t.XTestFakeKeyEvent(d,key,1,0);x.XFlush(d);time.sleep(.06)
    t.XTestFakeKeyEvent(d,key,0,0);x.XFlush(d);x.XCloseDisplay(d)
    raise SystemExit(0)
px,py,button=map(int,sys.argv[2:5])
t.XTestFakeMotionEvent(d,-1,px,py,0);x.XFlush(d);time.sleep(.08)
t.XTestFakeButtonEvent(d,button,1,0);x.XFlush(d);time.sleep(.06)
t.XTestFakeButtonEvent(d,button,0,0);x.XFlush(d)
x.XCloseDisplay(d)
