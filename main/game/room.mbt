///|
struct Room {
  index_position : (Int, Int)
  blocks : Array[Array[MapBlock]]
}

///|
let default_enemy_count = [0, 10, 15, 20, 25, 30, 30, 30, 30, 30, 30]

///|
fn summon_enemy(level : Int) -> EnemyBase {
  if level == 10 {
    // TODO: BOSS 生成的特殊逻辑
    enemy_info_map["（BOSS）废械吞噬者 · 饕餮"]
  } else {
    let can_summon_enemy = enemy_list.filter(enemy => enemy.level <= level)
    let enemy = can_summon_enemy[@rand.summon_random_number(
        0,
        can_summon_enemy.length() - 1,
      )]
    enemy
  }
}

///|
fn sumoon_postion(escape_set : Set[(Int, Int)]) -> (Int, Int) {
  let mut random_position_x = @rand.summon_random_number(0, 15)
  let mut random_position_y = @rand.summon_random_number(0, 15)
  while escape_set.contains((random_position_x, random_position_y)) {
    random_position_x = @rand.summon_random_number(0, 15)
    random_position_y = @rand.summon_random_number(0, 15)
  }
  (random_position_x, random_position_y)
}

///|
pub fn Room::new(
  level : Int,
  index_position : (Int, Int),
  escape_set : Set[(Int, Int)],
) -> Room {
  // 修复：创建完全独立的2D数组，避免共享引用
  let blocks = []
  for _ in 0..<16 {
    let row = []
    for _ in 0..<16 {
      row.push(MapBlock::new()) // 每个MapBlock都是独立的
    }
    blocks.push(row)
  }

  // 中心点设置为怪物生成器
  blocks[7][7].occupant = ChargingCoil
  for i in 0..<default_enemy_count[level] {
    let enemy = summon_enemy(level)
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    // 将房间内的本地坐标转换为全局坐标
    let global_position = (index_position.0 + position.0, index_position.1 + position.1)
    blocks[position.0][position.1].occupant = Occupant::Enemy(
      Enemy::new(enemy, global_position),
    )
  }
  // 生成 RefinedCopperIngot（作为地面资源，不占用格子）
  if @rand.check_probability(0.5) {
    let position = sumoon_postion(escape_set)
    // 不添加到 escape_set，允许铜偶站上去
    blocks[position.0][position.1].resources.push(
      Item::new(Resource(@resource.RefinedCopper), count=1),
    )
  }
  // 生成 ResonantStarCrystal（作为地面资源，不占用格子）
  if @rand.check_probability(0.5) {
    let position = sumoon_postion(escape_set)
    // 不添加到 escape_set，允许铜偶站上去
    blocks[position.0][position.1].resources.push(
      Item::new(Resource(@resource.ResonantCrystal), count=1),
    )
  }

  // 生成建筑（Structure）- 随机生成，概率50%
  if @rand.check_probability(0.5) {
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    // 根据房间等级选择建筑
    let structure_names = if level <= 3 {
      ["铆接壁垒", "齿轮箭塔", "维修工坊"]
    } else if level <= 6 {
      ["充能线圈", "共鸣警钟", "风暴铁砧"]
    } else {
      ["镜光折射塔", "心源矿钻", "充能线圈"]
    }
    let structure_name = structure_names[@rand.summon_random_number(
        0,
        structure_names.length() - 1,
      )]
    let structure_base = @structure.structure_map[structure_name]
    blocks[position.0][position.1].occupant = Occupant::Structure(
      @structure.Structure::new(structure_base),
    )
  }
  { index_position, blocks }
}

///|
pub fn Room::is_coord_in_room(room : Room, coord : (Int, Int)) -> Bool {
  let (x, y) = coord
  let (room_x, room_y) = room.index_position
  x >= room_x && x < room_x + 16 && y >= room_y && y < room_y + 16
}

///|
pub fn Room::position_to_global_position(
  room : Room,
  coord : (Int, Int),
) -> (Int, Int) {
  let (x, y) = coord
  let (room_x, room_y) = room.index_position
  (x + room_x, y + room_y)
}

///|
pub fn Room::get_room_direction_and_new_position(
  room : Room,
  coord : (Int, Int),
) -> (Direction, (Int, Int)) {
  let (x, y) = coord
  let (room_x, room_y) = room.index_position
  let relative_x = x - room_x
  let relative_y = y - room_y
  if relative_x < 0 {
    if relative_y < 0 {
      (LeftDown, (room_x - 16, room_y))
    } else if relative_y >= 16 {
      (LeftUp, (room_x - 16, room_y + 16))
    } else {
      (Left, (room_x - 16, room_y))
    }
  } else if relative_x >= 16 {
    if relative_y < 0 {
      (RightDown, (room_x + 16, room_y))
    } else if relative_y >= 16 {
      (RightUp, (room_x + 16, room_y + 16))
    } else {
      (Right, (room_x + 16, room_y))
    }
  } else if relative_y < 0 {
    (Down, (room_x, room_y - 16))
  } else {
    (Up, (room_x, room_y + 16))
  }
}
