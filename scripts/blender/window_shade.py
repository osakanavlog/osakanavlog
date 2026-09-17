"""プリーツスクリーンのある窓辺を再現する。

要点は3つ。
  1. スクリーンは Translucent を混ぜて背後からの光を透過させる（発光させない）
  2. プリーツは実ジオメトリで作る。バンプでは陰影の縞が平板になる
  3. 壁の光の溜まりは天井際のスポットで作る。環境光を上げると falloff が消える
"""

import bpy
from math import radians, sin, pi

CONFIG = {
    # 部屋
    "room_w":      3.4,
    "room_d":      5.0,
    "ceiling":     2.50,
    # 窓開口
    "win_x":       0.79,    # 開口の左右端（中心から）。写真の縦長比に合わせる
    "win_bottom":  0.08,
    "win_top":     2.28,
    "reveal":      0.13,    # 見込み（壁の厚み）
    # プリーツ
    "pleat_pitch": 0.018,   # 山の間隔
    "pleat_amp":   0.0045,  # 山の深さ
    "pleat_rows":  620,     # 縦方向の分割数
    # 描画
    "lens_mm":     32.0,
    "samples":     128,   # デノイザ有効が前提。無効なら 400 程度必要
    "res_x":       740,
    "res_y":       1010,
    "output":      "//window_shade.png",
}


# ---------------------------------------------------------------
# ユーティリティ
# ---------------------------------------------------------------
def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                  bpy.data.cameras, bpy.data.textures):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def box(name, x0, x1, y0, y1, z0, z1, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    ob = bpy.context.active_object
    ob.name = name
    ob.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    ob.dimensions = (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0))
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        ob.data.materials.append(mat)
    return ob


def principled(name, color, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


# ---------------------------------------------------------------
# マテリアル
# ---------------------------------------------------------------
def make_shade_material():
    """半透明のスクリーン地。

    Emission で光らせると背後の光源と無関係に光ってしまい、
    窓際だけ明るいという当たり方が再現できない。
    Translucent を混ぜて実際に光を透過させる。
    """
    mat = bpy.data.materials.new("ShadeFabric")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out   = nt.nodes.new("ShaderNodeOutputMaterial")
    mix   = nt.nodes.new("ShaderNodeMixShader")
    trans = nt.nodes.new("ShaderNodeBsdfTranslucent")
    diff  = nt.nodes.new("ShaderNodeBsdfDiffuse")

    white = (0.94, 0.92, 0.88, 1.0)
    diff.inputs["Color"].default_value = white
    diff.inputs["Roughness"].default_value = 0.85

    # 折り目では生地が重なって透過が落ちる。
    # 実物のプリーツが細い暗線として見えるのはこのため。
    # 山の間隔に合わせた縞で Translucent の色を変調する。
    wave = nt.nodes.new("ShaderNodeTexWave")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Z"
    wave.wave_profile = "SIN"
    wave.inputs["Scale"].default_value = 1.0 / CONFIG["pleat_pitch"]
    wave.inputs["Distortion"].default_value = 0.0
    wave.inputs["Detail"].default_value = 0.0

    ramp.color_ramp.elements[0].position = 0.18
    ramp.color_ramp.elements[0].color = (0.34, 0.32, 0.29, 1.0)   # 折り目
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = white                      # 生地面

    mix.inputs["Fac"].default_value = 0.62      # 透過寄り

    nt.links.new(wave.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], trans.inputs["Color"])
    nt.links.new(diff.outputs["BSDF"], mix.inputs[1])
    nt.links.new(trans.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return mat


def make_floor_material():
    """無垢フローリング。板の継ぎ目と木目を重ねる。"""
    mat = bpy.data.materials.new("OakFloor")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out   = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf  = nt.nodes.new("ShaderNodeBsdfPrincipled")
    ramp  = nt.nodes.new("ShaderNodeValToRGB")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    mapn  = nt.nodes.new("ShaderNodeMapping")
    coord = nt.nodes.new("ShaderNodeTexCoord")

    # Y 方向に細かく X 方向に伸ばす = 板の長手に沿った木目
    mapn.inputs["Scale"].default_value = (0.25, 9.0, 1.0)
    noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 9.0
    noise.inputs["Roughness"].default_value = 0.55

    ramp.color_ramp.elements[0].position = 0.36
    ramp.color_ramp.elements[0].color = (0.30, 0.18, 0.095, 1.0)
    ramp.color_ramp.elements[1].position = 0.64
    ramp.color_ramp.elements[1].color = (0.52, 0.34, 0.19, 1.0)

    bsdf.inputs["Roughness"].default_value = 0.30   # つやのある仕上げ

    nt.links.new(coord.outputs["Object"], mapn.inputs["Vector"])
    nt.links.new(mapn.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


# ---------------------------------------------------------------
# ジオメトリ
# ---------------------------------------------------------------
def build_shade(cfg, mat):
    """プリーツを実ジオメトリで作る。

    高密度グリッドを立て、各頂点を Z に応じて Y 方向へ正弦波で押し出す。
    Displace モディファイアより単純で、山の間隔と深さを直接指定できる。
    """
    w = cfg["win_x"] * 2 - 0.01
    h = cfg["win_top"] - cfg["win_bottom"] - 0.01

    bpy.ops.mesh.primitive_grid_add(x_subdivisions=10,
                                    y_subdivisions=cfg["pleat_rows"],
                                    size=1.0)
    ob = bpy.context.active_object
    ob.name = "Shade"
    ob.rotation_euler = (radians(90), 0, 0)      # 垂直に立てる
    ob.scale = (w, h, 1.0)
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    ob.location = (0.0, cfg["reveal"] - 0.035,
                   (cfg["win_bottom"] + cfg["win_top"]) / 2)

    k = 2 * pi / cfg["pleat_pitch"]
    for v in ob.data.vertices:
        v.co.y += cfg["pleat_amp"] * sin(v.co.z * k)

    ob.data.materials.append(mat)
    # 山を滑らかに見せる
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def build_room(cfg, mats):
    rw, rd, ch = cfg["room_w"], cfg["room_d"], cfg["ceiling"]
    wx, wb, wt, rv = cfg["win_x"], cfg["win_bottom"], cfg["win_top"], cfg["reveal"]

    box("Floor",   -rw, rw, -rd, 0.0, -0.02, 0.0, mats["floor"])
    box("Ceiling", -rw, rw, -rd, 0.0, ch, ch + 0.02, mats["wall"])
    box("SideWall_L", -rw - 0.02, -rw, -rd, 0.0, 0.0, ch, mats["wall"])
    box("SideWall_R",  rw, rw + 0.02, -rd, 0.0, 0.0, ch, mats["wall"])

    # 背面壁は開口を避けて 4 分割。ブーリアンより確実
    box("Wall_Above", -rw, rw, 0.0, rv, wt, ch, mats["wall"])
    box("Wall_Below", -rw, rw, 0.0, rv, 0.0, wb, mats["wall"])
    box("Wall_Left",  -rw, -wx, 0.0, rv, wb, wt, mats["wall"])
    box("Wall_Right",  wx,  rw, 0.0, rv, wb, wt, mats["wall"])

    # 開口の奥（外）を塞ぐ。ここに採光の光源を置く
    box("Outside", -rw, rw, rv + 1.6, rv + 1.64, 0.0, ch, mats["wall"])

    # ヘッドレール
    box("HeadRail", -wx, wx, rv - 0.075, rv - 0.005, wt - 0.045, wt - 0.005,
        mats["rail"])

    # 操作コード（右寄り）
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0022, depth=1.30,
                                        location=(wx - 0.10, rv - 0.045, wt - 0.70))
    cord = bpy.context.active_object
    cord.name = "Cord"
    cord.data.materials.append(mats["rail"])

    # 床ガラリ
    box("FloorVent", -1.30, -0.75, -0.30, -0.16, 0.0, 0.006, mats["vent"])

    # コンセントプレート
    box("Outlet", -rw + 0.005, -rw + 0.012, -1.02, -0.90, 0.22, 0.34, mats["plate"])


# ---------------------------------------------------------------
# 照明
# ---------------------------------------------------------------
def setup_lights(cfg):
    """採光と室内灯を分ける。

    スクリーンの発光は開口の奥に置いた面光源が透過して生まれるもので、
    マテリアル側では光らせていない。
    """
    scene = bpy.context.scene
    rv = cfg["reveal"]

    # 屋外の採光。開口いっぱいの面光源を外に置き、室内へ向ける
    ld = bpy.data.lights.new("Daylight", type="AREA")
    ld.shape = "RECTANGLE"
    ld.size, ld.size_y = cfg["win_x"] * 2.3, cfg["win_top"] * 1.1
    ld.energy = 68.0
    ld.color = (1.0, 0.97, 0.92)
    day = bpy.data.objects.new("Daylight", ld)
    day.location = (0.0, rv + 0.82, cfg["win_top"] * 0.42)
    day.rotation_euler = (radians(-90), 0, 0)    # -Y（室内）を向く
    scene.collection.objects.link(day)

    # 天井際の室内灯。壁の上部に明るい溜まりを作る
    sd = bpy.data.lights.new("WallWash", type="SPOT")
    sd.energy = 395.0
    sd.color = (1.0, 0.78, 0.52)                 # 電球色
    sd.spot_size = radians(84)
    sd.spot_blend = 0.85
    # 光源は半径 shadow_soft_size の球として扱われる。
    # 天井を貫通させるとサンプルの半分が遮蔽され、極端なノイズ源になる。
    # 天井 (z=ceiling) との距離より小さく取ること。
    sd.shadow_soft_size = 0.22
    wash = bpy.data.objects.new("WallWash", sd)
    wash.location = (-1.38, -0.95, cfg["ceiling"] - 0.30)
    wash.rotation_euler = (radians(52), 0, radians(26))   # 左上から壁を舐める
    scene.collection.objects.link(wash)

    # ごく弱い環境光。上げすぎると壁の falloff が消える
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.34, 0.28, 0.21, 1.0)
    bg.inputs["Strength"].default_value = 0.12

    # 室内の回り込み。壁の下部が黒く沈むのを防ぐ弱い面光源
    fd = bpy.data.lights.new("RoomFill", type="AREA")
    fd.size, fd.energy = 4.2, 30.0
    fd.color = (1.0, 0.84, 0.64)
    fill = bpy.data.objects.new("RoomFill", fd)
    fill.location = (-0.9, -2.3, 1.75)
    fill.rotation_euler = (radians(74), 0, radians(-16))
    scene.collection.objects.link(fill)


def setup_camera(cfg):
    scene = bpy.context.scene
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.09, 1.20))
    target = bpy.context.active_object
    target.name = "CamTarget"

    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    cam.location = (-0.30, -2.45, 1.25)
    cam_data.lens = cfg["lens_mm"]
    cam_data.sensor_width = 36.0
    cam_data.clip_start = 0.01

    track = cam.constraints.new(type="TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    return cam


def setup_render(cfg):
    scene = bpy.context.scene
    try:
        scene.render.engine = "CYCLES"
    except TypeError as e:
        print("Cycles 不可:", e)
    if scene.render.engine == "CYCLES":
        scene.cycles.device = "CPU"
        scene.cycles.samples = cfg["samples"]
        # 半透明を通る光は透過回数を確保しないと暗く沈む
        scene.cycles.transmission_bounces = 12
        scene.cycles.transparent_max_bounces = 12
        # 公式ビルドには OpenImageDenoise が入っている。
        # 室内は間接光主体でノイズが出やすいので必ず有効にする。
        #
        # 注意: デノイザ非搭載ビルド（Ubuntu の apt 版など）でも、この代入自体は
        # 通ってしまう。失敗はレンダリング実行時に
        # "Error: Build without OpenImageDenoiser" として初めて出る。
        # そうした環境では手動で False にし、サンプル数を上げること。
        scene.cycles.use_denoising = True

    vs = scene.view_settings
    for candidate in ("Filmic", "Standard"):
        try:
            vs.view_transform = candidate
            break
        except TypeError:
            continue
    vs.exposure = 0.0

    scene.render.resolution_x = cfg["res_x"]
    scene.render.resolution_y = cfg["res_y"]
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = cfg["output"]


def main(cfg=CONFIG):
    clear_scene()
    mats = {
        "wall":  principled("Wall",  (0.70, 0.60, 0.46, 1.0), roughness=0.92),
        "floor": make_floor_material(),
        "shade": make_shade_material(),
        "rail":  principled("Rail",  (0.62, 0.55, 0.42, 1.0), roughness=0.45),
        "vent":  principled("Vent",  (0.26, 0.26, 0.26, 1.0), roughness=0.6),
        "plate": principled("Plate", (0.88, 0.86, 0.82, 1.0), roughness=0.7),
    }
    build_room(cfg, mats)
    build_shade(cfg, mats["shade"])
    setup_lights(cfg)
    setup_camera(cfg)
    setup_render(cfg)
    print("構築完了。オブジェクト数:", len(bpy.context.scene.objects))


if __name__ == "__main__":
    main()
