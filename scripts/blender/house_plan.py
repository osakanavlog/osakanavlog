"""平面図から住宅の立体パースを起こす。

天井高 CH=2400。外壁は塗調のグレー、内部はライトアイボリーの折り目調クロス。

寸法について
    図面に読み取れる寸法線がないため、建具の表記（引違い窓 W2,560 など）から
    縮尺を逆算し、910mm グリッドに載せている。実測値が分かれば GRID と
    ROOMS / WALLS の座標を差し替えれば作り直せる。

座標系
    X: 図面の右方向 / Y: 図面の上方向 / Z: 高さ。原点は建物の左下隅。
"""

import bpy
from math import radians

G = 0.910                      # 基準グリッド（半間）
CH = 2.400                     # 天井高
T_EXT = 0.150                  # 外壁厚
T_INT = 0.100                  # 間仕切壁厚
FLOOR_T = 0.060

W = 12.5 * G                   # 建物外形 幅 11.375
D = 10.0 * G                   # 建物外形 奥行 9.100

DOOR_H = 2.000                 # 建具高さ
SILL_LOW = 0.400               # 腰窓の窓台高さ


def g(n):
    """グリッド数を実寸に変換する。"""
    return n * G


# ---------------------------------------------------------------
# 部屋割り  (名前, x0, y0, x1, y1, 床仕上げ)
# 図面上の配置をグリッドに載せたもの
# ---------------------------------------------------------------
ROOMS = [
    # --- 南側 ---
    ("LDK",        g(0.5), g(0.5), g(7.5), g(5.0), "oak"),
    ("寝室",        g(9.0), g(0.5), g(12.0), g(4.0), "oak"),
    ("クローゼット1", g(8.0), g(3.0), g(9.0), g(4.0), "oak"),
    ("トイレ",       g(0.5), g(4.0), g(1.5), g(5.0), "cf"),
    # --- 中央 ---
    ("WIC",        g(9.0), g(4.0), g(11.0), g(5.0), "oak"),
    ("洗面脱衣室",   g(7.0), g(4.5), g(9.0), g(5.5), "ft"),
    ("UB",         g(9.0), g(5.0), g(11.0), g(7.0), "ub"),
    ("物干",        g(5.0), g(5.0), g(7.0), g(6.0), "oak"),
    ("空調室",      g(3.0), g(5.5), g(5.0), g(6.5), "oak"),
    ("収納1",       g(1.0), g(5.0), g(2.0), g(6.0), "oak"),
    ("階段",        g(0.5), g(5.0), g(1.0), g(7.0), "oak"),
    # --- 北側 ---
    ("納戸",        g(0.5), g(6.5), g(3.0), g(8.5), "oak"),
    ("ホール",      g(3.5), g(6.5), g(6.0), g(8.0), "oak"),
    ("玄関",        g(3.5), g(8.0), g(6.0), g(9.5), "ft"),
    ("玄関収納",    g(6.0), g(8.0), g(7.0), g(9.5), "oak"),
    ("クローゼット2", g(6.0), g(6.5), g(7.0), g(8.0), "oak"),
    ("洋室",        g(7.5), g(7.0), g(12.0), g(9.5), "oak"),
    ("収納2",       g(7.0), g(5.5), g(9.0), g(6.5), "oak"),
]


# ---------------------------------------------------------------
# 壁  (x0, y0, x1, y1, 厚み, 開口リスト)
# 開口は壁の始点からの距離 t で指定する (t0, t1, z0, z1)
# ---------------------------------------------------------------
def exterior_walls():
    """外周。窓と玄関ドアの開口を持つ。"""
    return [
        # 南面（下）: 横すべり出し窓 W730 / 引違い窓 W2,560 / 横すべり出し窓 W1,690
        (0, 0, W, 0, T_EXT, [
            (1.30, 2.03, 1.00, 1.77),          # W730 + H770
            (4.60, 7.16, 0.05, 2.05),          # 引違い W2,560 + H2,000
            (8.60, 10.29, 1.60, 2.00),         # W1,690 + H400
        ]),
        # 東面（右）
        (W, 0, W, D, T_EXT, [
            (1.20, 2.10, 1.00, 1.90),
            (6.60, 7.90, 1.00, 1.90),
        ]),
        # 北面（上）: 横すべり出し窓 W1,690 + H400 ほか
        (W, D, 0, D, T_EXT, [
            (0.70, 2.39, 1.60, 2.00),          # W1,690 + H400
            (4.60, 6.20, 1.00, 1.90),          # W1600 ローカウンター
            (6.55, 7.45, 0.00, 2.33),          # 玄関ドア W939 + H2,330
        ]),
        # 西面（左）
        (0, D, 0, 0, T_EXT, [
            (2.20, 3.60, 1.00, 1.90),
            (5.60, 6.50, 1.00, 1.90),
        ]),
    ]


def interior_walls():
    """間仕切。開口は建具（DOOR_H まで）。"""
    d = (0.0, 0.0, 0.0, DOOR_H)   # プレースホルダ
    return [
        # LDK と北側の境
        (g(0.5), g(5.0), g(7.5), g(5.0), T_INT, [(g(2.0), g(2.9), 0, DOOR_H)]),
        # LDK と東側（寝室・クローゼット）の境
        (g(7.5), g(0.5), g(7.5), g(5.0), T_INT, [(g(1.0), g(1.9), 0, DOOR_H)]),
        # 寝室 / クローゼット1
        (g(8.0), g(4.0), g(12.0), g(4.0), T_INT, [(g(1.6), g(2.5), 0, DOOR_H)]),
        (g(8.0), g(3.0), g(8.0), g(4.0), T_INT, []),
        (g(9.0), g(0.5), g(9.0), g(4.0), T_INT, [(g(2.1), g(3.0), 0, DOOR_H)]),
        # 洗面脱衣室 / UB
        (g(7.0), g(4.5), g(7.0), g(6.5), T_INT, [(g(0.6), g(1.5), 0, DOOR_H)]),
        (g(9.0), g(4.5), g(9.0), g(7.0), T_INT, [(g(0.7), g(1.6), 0, DOOR_H)]),
        (g(7.0), g(5.5), g(9.0), g(5.5), T_INT, []),
        (g(9.0), g(5.0), g(11.0), g(5.0), T_INT, []),
        (g(11.0), g(4.0), g(11.0), g(7.0), T_INT, []),
        (g(9.0), g(7.0), g(11.0), g(7.0), T_INT, []),
        # 中央の物干・空調室
        (g(3.0), g(5.5), g(7.0), g(5.5), T_INT, [(g(1.2), g(2.1), 0, DOOR_H)]),
        (g(5.0), g(5.0), g(5.0), g(6.0), T_INT, []),
        (g(3.0), g(5.5), g(3.0), g(6.5), T_INT, []),
        (g(3.0), g(6.5), g(5.0), g(6.5), T_INT, [(g(0.5), g(1.4), 0, DOOR_H)]),
        # 収納1 / 階段
        (g(1.0), g(5.0), g(1.0), g(7.0), T_INT, []),
        (g(2.0), g(5.0), g(2.0), g(6.0), T_INT, []),
        (g(1.0), g(6.0), g(2.0), g(6.0), T_INT, []),
        (g(0.5), g(4.0), g(1.5), g(4.0), T_INT, []),
        (g(1.5), g(4.0), g(1.5), g(5.0), T_INT, [(g(0.1), g(0.8), 0, DOOR_H)]),
        # 納戸
        (g(0.5), g(6.5), g(3.0), g(6.5), T_INT, []),
        (g(3.0), g(6.5), g(3.0), g(8.5), T_INT, [(g(0.4), g(1.3), 0, DOOR_H)]),
        (g(0.5), g(8.5), g(3.0), g(8.5), T_INT, []),
        # 玄関 / ホール
        (g(3.5), g(6.5), g(3.5), g(9.5), T_INT, []),
        (g(3.5), g(8.0), g(6.0), g(8.0), T_INT, [(g(0.8), g(1.9), 0, DOOR_H)]),
        (g(6.0), g(6.5), g(6.0), g(9.5), T_INT, []),
        (g(7.0), g(6.5), g(7.0), g(9.5), T_INT, []),
        (g(6.0), g(8.0), g(7.0), g(8.0), T_INT, []),
        (g(3.5), g(6.5), g(6.0), g(6.5), T_INT, [(g(1.0), g(1.9), 0, DOOR_H)]),
        # 洋室
        (g(7.0), g(7.0), g(12.0), g(7.0), T_INT, [(g(1.2), g(2.1), 0, DOOR_H)]),
        (g(7.0), g(6.5), g(9.0), g(6.5), T_INT, []),
    ]


# ---------------------------------------------------------------
# マテリアル
# ---------------------------------------------------------------
def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                  bpy.data.cameras, bpy.data.worlds):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def plain(name, color, roughness=0.6, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Metallic"].default_value = metallic
    return mat


def textured(name, light, dark, scale, squash, detail=8.0, roughness=0.7,
             bump=0.0):
    """ノイズを一方向に潰して質感を作る共通関数。

    squash を小さくした軸に沿って模様が伸びる。
    木目なら縦、塗り壁なら等方、クロスの折り目なら縦方向に使う。
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out   = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf  = nt.nodes.new("ShaderNodeBsdfPrincipled")
    ramp  = nt.nodes.new("ShaderNodeValToRGB")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    mapn  = nt.nodes.new("ShaderNodeMapping")
    coord = nt.nodes.new("ShaderNodeTexCoord")

    mapn.inputs["Scale"].default_value = scale
    noise.inputs["Scale"].default_value = squash
    noise.inputs["Detail"].default_value = detail
    noise.inputs["Roughness"].default_value = 0.55

    ramp.color_ramp.elements[0].position = 0.38
    ramp.color_ramp.elements[0].color = dark
    ramp.color_ramp.elements[1].position = 0.62
    ramp.color_ramp.elements[1].color = light
    bsdf.inputs["Roughness"].default_value = roughness

    nt.links.new(coord.outputs["Object"], mapn.inputs["Vector"])
    nt.links.new(mapn.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    if bump:
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        nt.links.new(noise.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def build_materials():
    return {
        # 外壁：塗調のグレー。細かい凹凸で塗り肌を出す
        "ext": textured("ExtPaint",
                        light=(0.205, 0.209, 0.213, 1.0),
                        dark=(0.152, 0.155, 0.159, 1.0),
                        scale=(36.0, 36.0, 36.0), squash=3.0,
                        roughness=0.86, bump=0.22),
        # 内壁：ライトアイボリーの折り目調クロス。縦に伸びた微細な陰影
        "int": textured("IvoryCloth",
                        light=(0.905, 0.880, 0.825, 1.0),
                        dark=(0.855, 0.828, 0.772, 1.0),
                        scale=(26.0, 26.0, 1.8), squash=3.0,
                        roughness=0.90, bump=0.12),
        "ceil": plain("Ceiling", (0.925, 0.912, 0.880, 1.0), roughness=0.95),
        # 床：ナラ樫。縦（板の長手）に伸ばす
        "oak": textured("OakFloor",
                        light=(0.560, 0.392, 0.228, 1.0),
                        dark=(0.372, 0.235, 0.124, 1.0),
                        scale=(0.30, 11.0, 1.0), squash=3.0,
                        roughness=0.34),
        "cf":  plain("CushionFloor", (0.760, 0.740, 0.700, 1.0), roughness=0.55),
        "ft":  plain("FloorTile",    (0.545, 0.520, 0.485, 1.0), roughness=0.42),
        "ub":  plain("UBPan",        (0.880, 0.880, 0.885, 1.0), roughness=0.30),
        # 家具
        "wood":  plain("Wood",   (0.470, 0.320, 0.185, 1.0), roughness=0.40),
        "teak":  plain("Teak",   (0.395, 0.255, 0.140, 1.0), roughness=0.38),
        "fabric":plain("Fabric", (0.415, 0.420, 0.430, 1.0), roughness=0.92),
        "linen": plain("Linen",  (0.880, 0.870, 0.845, 1.0), roughness=0.90),
        "white": plain("White",  (0.900, 0.900, 0.898, 1.0), roughness=0.45),
        "steel": plain("Steel",  (0.620, 0.625, 0.635, 1.0), roughness=0.28,
                       metallic=0.85),
        "glass": plain("GlassLite", (0.760, 0.820, 0.850, 1.0), roughness=0.08),
        "dark":  plain("DarkPanel", (0.145, 0.145, 0.150, 1.0), roughness=0.45),
        "grass": plain("Ground", (0.300, 0.320, 0.270, 1.0), roughness=0.95),
        "roof":  plain("Roofing", (0.085, 0.088, 0.092, 1.0), roughness=0.90),
    }


# ---------------------------------------------------------------
# ジオメトリ生成
# ---------------------------------------------------------------
def box(name, x0, x1, y0, y1, z0, z1, mat=None, collection=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    ob = bpy.context.active_object
    ob.name = name
    ob.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    ob.dimensions = (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0))
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        ob.data.materials.append(mat)
    if collection is not None:
        for c in ob.users_collection:
            c.objects.unlink(ob)
        collection.objects.link(ob)
    return ob


def wall_segments(x0, y0, x1, y1, thick, openings, height, name, mat, coll,
                  offset=0.0):
    """壁を開口で分割して直方体の集合として作る。

    ブーリアンを使わない。面が破綻せず、開口位置を数値で確認できる。
    """
    import math
    length = math.hypot(x1 - x0, y1 - y0)
    if length < 1e-6:
        return
    ux, uy = (x1 - x0) / length, (y1 - y0) / length
    nx, ny = -uy, ux                                  # 壁厚方向（進行方向の左）
    x0 += nx * offset; y0 += ny * offset
    x1 += nx * offset; y1 += ny * offset

    def piece(t0, t1, z0, z1, idx):
        if t1 - t0 < 1e-4 or z1 - z0 < 1e-4:
            return
        ax, ay = x0 + ux * t0, y0 + uy * t0
        bx, by = x0 + ux * t1, y0 + uy * t1
        h = thick / 2
        xs = [ax + nx * h, ax - nx * h, bx + nx * h, bx - nx * h]
        ys = [ay + ny * h, ay - ny * h, by + ny * h, by - ny * h]
        box(f"{name}_{idx}", min(xs), max(xs), min(ys), max(ys), z0, z1,
            mat, coll)

    ops = sorted(openings, key=lambda o: o[0])
    cursor, idx = 0.0, 0
    for (t0, t1, z0, z1) in ops:
        t0, t1 = max(0.0, t0), min(length, t1)
        piece(cursor, t0, 0.0, height, idx); idx += 1
        if z0 > 0.001:                                # 腰壁
            piece(t0, t1, 0.0, z0, idx); idx += 1
        if z1 < height - 0.001:                       # 垂れ壁
            piece(t0, t1, z1, height, idx); idx += 1
        cursor = t1
    piece(cursor, length, 0.0, height, idx)


def build_shell(mats, coll):
    # 外壁は二層構成。躯体の仕上げを室内側（ライトアイボリー）とし、
    # 外側に塗調グレーの薄い層を重ねる。
    # 外周は反時計回りに定義しているので、外側は法線の逆方向にあたる。
    CLAD = 0.022
    for i, (x0, y0, x1, y1, t, ops) in enumerate(exterior_walls()):
        wall_segments(x0, y0, x1, y1, t, ops, CH, f"ExtWall{i}",
                      mats["int"], coll)
        wall_segments(x0, y0, x1, y1, CLAD, ops, CH, f"ExtClad{i}",
                      mats["ext"], coll, offset=-(t / 2 + CLAD / 2))
    for i, (x0, y0, x1, y1, t, ops) in enumerate(interior_walls()):
        wall_segments(x0, y0, x1, y1, t, ops, CH, f"IntWall{i}", mats["int"], coll)

    # 開口のガラス。玄関ドアだけは框のないパネルとして扱う
    import math
    for i, (x0, y0, x1, y1, t, ops) in enumerate(exterior_walls()):
        length = math.hypot(x1 - x0, y1 - y0)
        ux, uy = (x1 - x0) / length, (y1 - y0) / length
        nx, ny = -uy, ux
        for j, (a, b, z0, z1) in enumerate(ops):
            is_door = (z1 - z0) > 2.2                  # 玄関ドア
            pane = 0.030 if is_door else 0.010
            ax, ay = x0 + ux * a, y0 + uy * a
            bx, by = x0 + ux * b, y0 + uy * b
            h = pane / 2
            xs = [ax + nx * h, ax - nx * h, bx + nx * h, bx - nx * h]
            ys = [ay + ny * h, ay - ny * h, by + ny * h, by - ny * h]
            box(f"Pane{i}_{j}", min(xs), max(xs), min(ys), max(ys),
                z0 + 0.01, z1 - 0.01,
                mats["dark"] if is_door else mats["glass"], coll)

    # 床スラブ（外周いっぱい）と各室の仕上げ床
    box("Slab", -0.30, W + 0.30, -0.30, D + 0.30, -FLOOR_T, 0.0, mats["ext"], coll)
    for (name, x0, y0, x1, y1, fin) in ROOMS:
        box(f"Floor_{name}", x0, x1, y0, y1, 0.0, 0.012, mats[fin], coll)

    # 敷地
    box("Ground", -9.0, W + 9.0, -9.0, D + 9.0, -0.32, -0.30, mats["grass"], coll)


# ---------------------------------------------------------------
# 家具
# ---------------------------------------------------------------
def build_roof(m, coll):
    """外観用の屋根。図面に屋根伏図がないため、緩勾配の切妻で当てている。"""
    EAVE = 0.55                      # 軒の出
    RIDGE = 1.35                     # 棟の高さ（軒先から）
    x0, x1 = -EAVE, W + EAVE
    y0, y1 = -EAVE, D + EAVE
    ym = (y0 + y1) / 2

    verts = [(x0, y0, CH + 0.12), (x1, y0, CH + 0.12),
             (x1, y1, CH + 0.12), (x0, y1, CH + 0.12),
             (x0, ym, CH + 0.12 + RIDGE), (x1, ym, CH + 0.12 + RIDGE)]
    faces = [(0, 1, 5, 4), (3, 2, 5, 4), (0, 1, 2, 3)]

    me = bpy.data.meshes.new("RoofMesh")
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new("Roof", me)
    ob.data.materials.append(m["roof"])
    coll.objects.link(ob)

    sm = ob.modifiers.new("Solidify", type="SOLIDIFY")
    sm.thickness = 0.14
    sm.offset = 1.0
    return ob


def build_furniture(m, coll):
    def b(n, x0, x1, y0, y1, z0, z1, mat):
        return box(n, x0, x1, y0, y1, z0, z1, mat, coll)

    # ---- LDK：ソファ / ローテーブル / TVボード ----
    b("Sofa_base", g(2.6), g(4.9), g(2.0), g(3.0), 0.10, 0.42, m["fabric"])
    b("Sofa_back", g(2.6), g(4.9), g(2.0), g(2.2), 0.42, 0.80, m["fabric"])
    b("Sofa_armL", g(2.6), g(2.8), g(2.0), g(3.0), 0.42, 0.62, m["fabric"])
    b("Sofa_armR", g(4.7), g(4.9), g(2.0), g(3.0), 0.42, 0.62, m["fabric"])
    b("LowTable",  g(3.1), g(4.4), g(3.3), g(3.9), 0.36, 0.40, m["wood"])
    b("TVBoard",   g(2.9), g(4.6), g(0.7), g(1.1), 0.00, 0.42, m["wood"])
    b("TV",        g(3.2), g(4.3), g(0.85), g(0.90), 0.42, 1.08, m["dark"])

    # ---- ダイニング：テーブル + 椅子4脚 ----
    b("DinTable_top", g(5.0), g(6.7), g(1.6), g(2.7), 0.68, 0.72, m["teak"])
    for i, (dx, dy) in enumerate([(5.15, 1.75), (6.35, 1.75),
                                  (5.15, 2.45), (6.35, 2.45)]):
        b(f"DinLeg{i}", g(dx), g(dx) + 0.06, g(dy), g(dy) + 0.06, 0.0, 0.68,
          m["teak"])
    for i, (cx, cy) in enumerate([(5.25, 1.15), (6.25, 1.15),
                                  (5.25, 3.05), (6.25, 3.05)]):
        b(f"Chair{i}_seat", g(cx), g(cx) + 0.45, g(cy), g(cy) + 0.45,
          0.42, 0.46, m["wood"])
        b(f"Chair{i}_back", g(cx), g(cx) + 0.45, g(cy), g(cy) + 0.05,
          0.46, 0.90, m["wood"])

    # ---- キッチン：I型カウンター + コンロ + シンク + 冷蔵庫 ----
    b("KitCounter", g(0.7), g(0.75) + 2.55, g(3.3), g(3.3) + 0.65,
      0.00, 0.85, m["white"])
    b("KitTop",     g(0.7) - 0.02, g(0.75) + 2.57, g(3.3) - 0.02, g(3.3) + 0.67,
      0.85, 0.89, m["steel"])
    b("Sink",       g(0.9), g(0.9) + 0.72, g(3.42), g(3.42) + 0.42,
      0.78, 0.86, m["steel"])
    b("Cooktop",    g(0.9) + 1.15, g(0.9) + 1.90, g(3.42), g(3.42) + 0.45,
      0.89, 0.91, m["dark"])
    b("Fridge",     g(0.6), g(0.6) + 0.70, g(4.15), g(4.15) + 0.70,
      0.00, 1.82, m["white"])
    # 対面カウンター（チーク・D450・FL+720）
    b("BarCounter", g(0.7), g(0.7) + 2.55, g(2.55), g(2.55) + 0.45,
      0.72, 0.76, m["teak"])
    b("BarPanel",   g(0.7), g(0.7) + 2.55, g(2.95), g(2.95) + 0.05,
      0.00, 0.72, m["wood"])

    # ---- 寝室：ダブルベッド + サイドテーブル ----
    b("Bed_base",  g(9.6), g(9.6) + 1.45, g(1.1), g(1.1) + 2.00, 0.05, 0.32,
      m["wood"])
    b("Bed_mat",   g(9.6), g(9.6) + 1.45, g(1.1), g(1.1) + 2.00, 0.32, 0.52,
      m["linen"])
    b("Bed_head",  g(9.6), g(9.6) + 1.45, g(1.1) - 0.08, g(1.1), 0.05, 0.95,
      m["wood"])
    b("NightTbl",  g(9.6) + 1.50, g(9.6) + 1.95, g(1.1), g(1.1) + 0.45,
      0.00, 0.50, m["wood"])

    # ---- 洋室：シングルベッド + デスク ----
    b("Bed2_base", g(10.2), g(10.2) + 1.00, g(7.4), g(7.4) + 1.95, 0.05, 0.32,
      m["wood"])
    b("Bed2_mat",  g(10.2), g(10.2) + 1.00, g(7.4), g(7.4) + 1.95, 0.32, 0.50,
      m["linen"])
    b("Desk",      g(7.8), g(7.8) + 1.10, g(8.9), g(8.9) + 0.55, 0.68, 0.72,
      m["wood"])
    b("DeskChair", g(8.1), g(8.1) + 0.45, g(8.3), g(8.3) + 0.45, 0.40, 0.44,
      m["fabric"])

    # ---- UB：浴槽 + 洗い場 ----
    b("Tub_outer", g(9.2), g(9.2) + 1.55, g(5.25), g(5.25) + 0.80, 0.00, 0.58,
      m["white"])
    b("Tub_water", g(9.28), g(9.28) + 1.39, g(5.33), g(5.33) + 0.64, 0.50, 0.54,
      m["glass"])

    # ---- 洗面脱衣室：洗面化粧台 W2400 ----
    b("Vanity",   g(7.15), g(7.15) + 1.60, g(4.62), g(4.62) + 0.50, 0.00, 0.80,
      m["white"])
    b("VanityTop",g(7.15), g(7.15) + 1.60, g(4.62), g(4.62) + 0.52, 0.80, 0.84,
      m["white"])
    b("Mirror",   g(7.15), g(7.15) + 1.60, g(4.60), g(4.60) + 0.03, 0.95, 1.85,
      m["glass"])
    b("Washer",   g(8.35), g(8.35) + 0.62, g(5.05), g(5.05) + 0.62, 0.00, 0.98,
      m["white"])

    # ---- トイレ ----
    b("WC_tank",  g(0.62), g(0.62) + 0.38, g(4.10), g(4.10) + 0.20, 0.00, 0.75,
      m["white"])
    b("WC_bowl",  g(0.62), g(0.62) + 0.38, g(4.30), g(4.30) + 0.55, 0.10, 0.40,
      m["white"])

    # ---- 玄関収納 / クローゼット類 ----
    b("ShoeCab",  g(6.1), g(6.9), g(8.1), g(8.1) + 0.40, 0.00, 2.30, m["wood"])
    b("Closet1",  g(8.1), g(8.9), g(3.1), g(3.1) + 0.60, 0.00, 2.30, m["wood"])
    b("Closet2",  g(6.1), g(6.9), g(6.6), g(6.6) + 0.60, 0.00, 2.30, m["wood"])
    b("WICShelf", g(9.1), g(10.9), g(4.1), g(4.1) + 0.45, 0.00, 2.00, m["wood"])
    b("Nando",    g(0.6), g(2.9), g(8.0), g(8.0) + 0.45, 0.00, 2.00, m["wood"])


# ---------------------------------------------------------------
# 照明・カメラ・レンダリング
# ---------------------------------------------------------------
def setup_world_and_sun():
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0.24, 0.47, 0.92, 1.0)   # 空色
    bg.inputs["Strength"].default_value = 0.55

    sd = bpy.data.lights.new("Sun", type="SUN")
    sd.energy = 5.4
    sd.angle = radians(2.5)
    sd.color = (1.0, 0.95, 0.88)
    sun = bpy.data.objects.new("Sun", sd)
    # 向きは d = (sin rx·sin rz, -sin rx·cos rz, -cos rx)。
    # 南西から射させるには rz を 90〜180 度に取る。
    sun.rotation_euler = (radians(48), 0, radians(140))
    scene.collection.objects.link(sun)
    return sun


def add_camera(name, loc, target_loc, lens):
    scene = bpy.context.scene
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=target_loc)
    tgt = bpy.context.active_object
    tgt.name = name + "_target"

    cd = bpy.data.cameras.new(name)
    cam = bpy.data.objects.new(name, cd)
    scene.collection.objects.link(cam)
    cam.location = loc
    cd.lens = lens
    cd.sensor_width = 36.0
    cd.clip_start = 0.05
    cd.clip_end = 300.0
    tr = cam.constraints.new(type="TRACK_TO")
    tr.target = tgt
    tr.track_axis = "TRACK_NEGATIVE_Z"
    tr.up_axis = "UP_Y"
    return cam


def set_cutaway(on):
    """俯瞰用に手前2面（南・西）の外壁を外す。

    外壁を全周残すと、見下ろしても手前の壁が室内を隠してしまう。
    exterior_walls() は南→東→北→西の順なので、索引 0 と 3 が手前側にあたる。
    開口のガラスも同時に外さないと宙に浮く。
    """
    prefixes = ("ExtWall0", "ExtClad0", "Pane0_", "ExtWall3", "ExtClad3", "Pane3_")
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.name.startswith(prefixes):
            ob.hide_render = on
            n += 1
    return n


def setup_render(samples=128, res=(1200, 900)):
    scene = bpy.context.scene
    try:
        scene.render.engine = "CYCLES"
    except TypeError as e:
        print("Cycles 不可:", e)
    if scene.render.engine == "CYCLES":
        scene.cycles.device = "CPU"
        scene.cycles.samples = samples
        # デノイザ非搭載ビルドでは代入が通ってもレンダリング時に落ちる
        scene.cycles.use_denoising = False
    vs = scene.view_settings
    for c in ("Filmic", "Standard"):
        try:
            vs.view_transform = c
            break
        except TypeError:
            continue
    vs.exposure = 0.0
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.image_settings.file_format = "PNG"


def main():
    clear_scene()
    m = build_materials()
    coll = bpy.context.scene.collection

    build_shell(m, coll)
    build_furniture(m, coll)
    roof = build_roof(m, coll)
    roof.hide_render = True          # 俯瞰では外す。外観時に戻す
    setup_world_and_sun()

    # 俯瞰（見下ろし）と外観の 2 視点
    add_camera("Cam_Dollhouse", (W * 0.5 - 7.6, -10.4, 12.6),
               (W * 0.5 - 0.3, D * 0.5 - 0.4, 0.9), 52.0)
    add_camera("Cam_Exterior", (-9.2, -10.6, 3.4),
               (W * 0.45, D * 0.45, 1.5), 35.0)
    bpy.context.scene.camera = bpy.data.objects["Cam_Dollhouse"]

    setup_render()
    print("構築完了。オブジェクト数:", len(bpy.context.scene.objects))
    print("建物外形: %.3f x %.3f m / CH=%.3f" % (W, D, CH))


if __name__ == "__main__":
    main()
