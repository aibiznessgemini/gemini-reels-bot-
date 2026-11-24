from shotkit import *
from rbx import story
from rbx.story import *
from rbx.toon import toon, studio
from rbx.stars import ball
V = Video(__file__); story.bind(V); V.end = 6.0

@V.shot(1, 0.0, 2.0, "full body")
def s1():
    studio()
    M = toon("messi", 0.0, 2.0, "determined", rot=-12)
    M.pose(0.0, armL=(0, 14), armR=(0, 14), legL=(0, 6), legR=(0, 6))
    ball("b", (-1.8, -1.0, 0.45))
    Cam().push(0.0, 2.0, (0, 0, 3.4), 15, 14.5, yaw=-8, pitch=6, lens=35)

@V.shot(2, 2.0, 4.0, "face close")
def s2():
    studio()
    M = toon("messi", 2.0, 4.0, "determined", rot=-12)
    Cam().push(2.0, 4.0, (0, -0.3, 5.6), 6, 5.8, yaw=-10, pitch=3, lens=40)

@V.shot(3, 4.0, 6.0, "back")
def s3():
    studio()
    M = toon("messi", 4.0, 6.0, "happy", rot=160)
    Cam().push(4.0, 6.0, (0, 0, 3.6), 14, 13.5, yaw=0, pitch=6, lens=35)

@V.shot(4, 6.0, 8.0, "3/4 face")
def s4():
    studio()
    M = toon("messi", 6.0, 8.0, "neutral", rot=0)
    Cam().push(6.0, 8.0, (0, -0.3, 5.6), 6, 5.8, yaw=-45, pitch=3, lens=40)

@V.shot(5, 8.0, 10.0, "profile")
def s5():
    studio()
    M = toon("messi", 8.0, 10.0, "neutral", rot=0)
    Cam().push(8.0, 10.0, (0, -0.3, 5.6), 6, 5.8, yaw=-90, pitch=3, lens=40)
V.end = 10.0

@V.shot(6, 10.0, 12.0, "joy 3/4")
def s6():
    studio()
    M = toon("messi", 10.0, 12.0, "joy", rot=0)
    Cam().push(10.0, 12.0, (0, -0.3, 5.5), 6.5, 6.2, yaw=-28, pitch=4, lens=40)
V.end = 12.0
