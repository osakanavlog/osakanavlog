"""
玄関収納パース生成スクリプト

Blender の Scripting タブに貼り付けて実行すると、
玄関収納一式・カメラ・照明・レンダリング設定までまとめて構築します。

対応: Blender 3.0 以降(4.x 確認済み)

寸法は CONFIG にまとめてあるので、実寸に合わせて書き換えてください。単位はメートル。
"""

import bpy
from math import radians

# =============================================================
# CONFIG  実寸に合わせてここだけ変更すれば作り直せます
# =============================================================
CONFIG = {
    "width":        1.20,   # 全幅
    "height":       2.35,   # 全高
    "post_face":    0.05,   # 化粧柱の見付
    "post_depth":   0.47,   # 化粧柱の出
    "depth_upper":  0.37,   # 吊戸棚の奥行
    "depth_lower":  0.42,   # 下部収納の奥行
    "depth_counter":0.45,   # カウンターの奥行
    "z_kick":       0.06,   # 台輪の高さ
    "z_counter":    0.80,   # カウンター下端
    "counter_thk":  0.03,   # カウンターの厚み
    "z_upper":      1.32,   # 吊戸棚の下端
    "z_upper_top":  2.30,   # 吊戸棚の上端
    "gap":          0.004,  # 建具の目地
    "upper_doors":  2,      # 吊戸棚の扉枚数
    "lower_doors":  2,      # 下部収納の扉枚数
    "lens_mm":      24.0,   # 焦点距離。小さいほどパースが強く出る
    "samples":      160,    # レンダリングのサンプル数
    "res_x":        760,
    "res_y":        1010,
    "output":       "//genkan_perspective.png",   # // は .blend と同じ場所
}


# =============================================================
# マテリアル
# =============================================================
def new_material(name, base_color, roughness=0.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    # ノードは type で引く。名前は UI 言語によって変わるため
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def new_wood(name, light, dark, h_scale=9.0, v_squash=0.30,
             ramp_lo=0.38, ramp_hi=0.62, roughness=0.34):
    """ノイズを縦方向に引き伸ばして木目を作る。

    Mapping の Scale を (h, h, v) とし v を小さくするのが要点。
    水平方向には細かく、垂直方向にはほとんど変化しないため、
    木目が縦に長く流れ、間隔も不規則になって突板らしい表情になる。
    波(Wave)テクスチャでは等間隔の縞にしかならない。
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out   = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf  = nt.nodes.new("ShaderNodeBsdfPrincipled")
    ramp  = nt.nodes.new("ShaderNodeValToRGB")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    mapn  = nt.nodes.new("ShaderNodeMapping")
    coord = nt.nodes.new("ShaderNodeTexCoord")

    for i, node in enumerate((coord, mapn, noise, ramp, bsdf, out)):
        node.location = (i * 220 - 900, 0)

    mapn.inputs["Scale"].default_value = (h_scale, h_scale, v_squash)
    noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 10.0
    noise.inputs["Roughness"].default_value = 0.55

    ramp.color_ramp.elements[0].position = ramp_lo
    ramp.color_ramp.elements[0].color = dark
    ramp.color_ramp.elements[1].position = ramp_hi
    ramp.color_ramp.elements[1].color = light

    bsdf.inputs["Roughness"].default_value = roughness

    nt.links.new(coord.outputs["Object"], mapn.inputs["Vector"])
    nt.links.new(mapn.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


# =============================================================
# ジオメトリ
# =============================================================
def box(name, x0, x1, y0, y1, z0, z1, mat):
    """対角 2 点で直方体を作る。

    木目に Object 座標を使うので、スケールは必ず適用する。
    適用しないとオブジェクトごとに木目の密度が変わってしまう。
    """
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    ob = bpy.context.active_object
    ob.name = name
    ob.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    ob.dimensions = (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0))
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    return ob


def split_doors(x0, x1, count, gap):
    """扉の割り付け。左右端と扉間に目地を取る。"""
    span = (x1 - x0 - gap * (count + 1)) / count
    return [(x0 + gap + i * (span + gap),
             x0 + gap + i * (span + gap) + span) for i in range(count)]


def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.materials,
                  bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def build_cabinet(cfg, mats):
    """壁を y=0 に置き、手前を -Y 方向として組み立てる。"""
    w_half = cfg["width"] / 2
    car_x  = w_half - cfg["post_face"]
    z_cnt_t = cfg["z_counter"] + cfg["counter_thk"]
    oak, oak_dk = mats["oak"], mats["oak_dark"]

    # 背景
    bpy.ops.mesh.primitive_plane_add(size=14.0, location=(0, 2.0, 0))
    bpy.context.active_object.name = "Floor"
    bpy.context.active_object.data.materials.append(mats["floor"])

    bpy.ops.mesh.primitive_plane_add(size=14.0, location=(0, 0, 1.6),
                                     rotation=(radians(90), 0, 0))
    bpy.context.active_object.name = "Wall"
    bpy.context.active_object.data.materials.append(mats["wall"])

    # 化粧柱(床から天井まで通し)
    box("Post_L", -w_half, -car_x, -cfg["post_depth"], 0, 0, cfg["height"], oak)
    box("Post_R",  car_x,  w_half, -cfg["post_depth"], 0, 0, cfg["height"], oak)

    # 台輪(濃色・後退させる)
    box("ToeKick", -car_x + 0.02, car_x - 0.02,
        -cfg["depth_lower"] + 0.05, 0, 0, cfg["z_kick"], oak_dk)

    # 下部収納
    box("Base_Carcass", -car_x, car_x, -cfg["depth_lower"] + 0.02, 0,
        cfg["z_kick"], cfg["z_counter"], oak)
    for i, (dx0, dx1) in enumerate(split_doors(-car_x, car_x,
                                               cfg["lower_doors"], cfg["gap"])):
        box(f"Base_Door_{i}", dx0, dx1,
            -cfg["depth_lower"], -cfg["depth_lower"] + 0.02,
            cfg["z_kick"] + cfg["gap"], cfg["z_counter"] - cfg["gap"], oak)

    # カウンター
    box("Counter", -car_x, car_x, -cfg["depth_counter"], 0,
        cfg["z_counter"], z_cnt_t, oak)

    # 吊戸棚
    box("Upper_Carcass", -car_x, car_x, -cfg["depth_upper"] + 0.02, 0,
        cfg["z_upper"], cfg["z_upper_top"], oak)
    for i, (dx0, dx1) in enumerate(split_doors(-car_x, car_x,
                                               cfg["upper_doors"], cfg["gap"])):
        box(f"Upper_Door_{i}", dx0, dx1,
            -cfg["depth_upper"], -cfg["depth_upper"] + 0.02,
            cfg["z_upper"] + cfg["gap"], cfg["z_upper_top"] - cfg["gap"], oak)

    # 吊戸棚上の埋め
    box("Filler_Top", -car_x, car_x, -cfg["depth_upper"] + 0.02, 0,
        cfg["z_upper_top"], cfg["height"], oak)


# =============================================================
# カメラと照明
# =============================================================
def setup_camera(cfg):
    """左前・やや低い位置から見上げる構図。

    パースは投影方式ではなく焦点距離と被写体までの距離で決まる。
    広角にするほど寄ることになり、遠近差が強調される。
    向きは Track To 制約で合わせる。手で回転を指定すると外しやすい。
    """
    scene = bpy.context.scene

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(-0.02, -0.18, 1.18))
    target = bpy.context.active_object
    target.name = "CamTarget"

    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    cam.location = (-1.05, -2.15, 1.38)
    cam_data.type = "PERSP"
    cam_data.lens = cfg["lens_mm"]
    cam_data.sensor_width = 36.0
    cam_data.clip_start = 0.01

    track = cam.constraints.new(type="TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    return cam


def setup_lights():
    scene = bpy.context.scene

    def area(name, loc, size, energy, rot=(0, 0, 0)):
        ld = bpy.data.lights.new(name, type="AREA")
        ld.size, ld.energy = size, energy
        ob = bpy.data.objects.new(name, ld)
        ob.location, ob.rotation_euler = loc, rot
        scene.collection.objects.link(ob)
        return ob

    # 面光源は大きいほど影が柔らかくなり、同じサンプル数でもノイズが減る
    area("Key",  (-0.9, -1.6, 2.55), 2.9, 32.0)
    area("Fill", (-2.2, -2.4, 1.50), 3.6, 13.0,
         rot=(radians(75), 0, radians(-50)))
    area("Top",  (0.4, -0.9, 2.60), 2.2, 17.0)

    build_environment()


def build_environment(sky_top=(0.62, 0.66, 0.72, 1.0),
                      sky_horizon=(0.50, 0.50, 0.50, 1.0),
                      ground=(0.22, 0.21, 0.20, 1.0),
                      strength=0.55):
    """HDRI の代わりになる環境光をノードで組む。外部ファイルは不要。

    Generated 座標の Z 成分を取り出し、上を明るく・下を床色にした縦の
    グラデーションにする。一様なグレー背景と違って上から光が回り込み、
    下からは弱い反射が返るので、陰影に方向性が出る。

    実物の HDRI が使える環境なら、Poly Haven などから取得したものに
    差し替えたほうが質は上がる。
    """
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()

    out  = nt.nodes.new("ShaderNodeOutputWorld")
    bg   = nt.nodes.new("ShaderNodeBackground")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    sep  = nt.nodes.new("ShaderNodeSeparateXYZ")
    mapr = nt.nodes.new("ShaderNodeMapRange")
    tex  = nt.nodes.new("ShaderNodeTexCoord")

    for i, n in enumerate((tex, sep, mapr, ramp, bg, out)):
        n.location = (i * 210 - 1050, 0)

    mapr.inputs["From Min"].default_value = -0.35
    mapr.inputs["From Max"].default_value = 0.85

    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = ground
    cr.elements[1].position = 0.52
    cr.elements[1].color = sky_horizon
    cr.elements.new(0.92).color = sky_top

    bg.inputs["Strength"].default_value = strength

    nt.links.new(tex.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], mapr.inputs["Value"])
    nt.links.new(mapr.outputs["Result"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return world


def setup_render(cfg):
    scene = bpy.context.scene

    # engine は動的な enum で RNA が実際の選択肢を報告しない。
    # 代入して TypeError を見るのが確実。
    try:
        scene.render.engine = "CYCLES"
    except TypeError as e:
        print("Cycles に切り替えられませんでした:", e)

    if scene.render.engine == "CYCLES":
        scene.cycles.device = "CPU"
        scene.cycles.samples = cfg["samples"]
        # デノイザがあるビルドなら使う。少ないサンプルで済む
        try:
            scene.cycles.use_denoising = True
        except Exception:
            pass

    # AgX は木材の彩度が落ちて白っぽくなるため Filmic を優先
    vs = scene.view_settings
    for candidate in ("Filmic", "Standard"):
        try:
            vs.view_transform = candidate
            break
        except TypeError:
            continue
    vs.exposure = -0.2

    scene.render.resolution_x = cfg["res_x"]
    scene.render.resolution_y = cfg["res_y"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = cfg["output"]


# =============================================================
# 実行
# =============================================================
def main(cfg=CONFIG, render=False):
    clear_scene()

    mats = {
        "oak": new_wood("Oak",
                        light=(0.750, 0.565, 0.340, 1.0),
                        dark=(0.590, 0.410, 0.225, 1.0)),
        "oak_dark": new_wood("OakDark",
                             light=(0.400, 0.275, 0.155, 1.0),
                             dark=(0.285, 0.185, 0.100, 1.0),
                             h_scale=13.0, v_squash=0.35, roughness=0.5),
        "wall":  new_material("Wall",  (0.88, 0.87, 0.85, 1.0), roughness=0.9),
        "floor": new_material("Floor", (0.42, 0.41, 0.40, 1.0), roughness=0.7),
    }

    build_cabinet(cfg, mats)
    setup_camera(cfg)
    setup_lights()
    setup_render(cfg)

    print("構築完了。オブジェクト数:", len(bpy.context.scene.objects))
    print("テンキー 0 でカメラ視点。F12 でレンダリング。")

    if render:
        bpy.ops.render.render(write_still=True)
        print("レンダリング完了 ->", bpy.context.scene.render.filepath)


if __name__ == "__main__":
    main()
