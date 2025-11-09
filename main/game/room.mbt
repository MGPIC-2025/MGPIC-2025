///|
priv struct Room {
  level : Int
  index_position : (Int, Int)
  blocks : Array[Array[MapBlock]]
}

///|
let default_enemy_count = [0, 2, 3, 3, 5, 5, 6, 6, 7, 8, 10]

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
  let mut random_position_x = @rand.summon_random_number(0, 14)
  let mut random_position_y = @rand.summon_random_number(0, 14)
  while escape_set.contains((random_position_x, random_position_y)) {
    random_position_x = @rand.summon_random_number(0, 14)
    random_position_y = @rand.summon_random_number(0, 14)
  }
  (random_position_x, random_position_y)
}

///|
fn Room::new(
  level : Int,
  index_position : (Int, Int),
  escape_set : Set[(Int, Int)],
) -> Room {
  // 修复：创建完全独立的2D数组，避免共享引用
  let blocks = []
  for _ in 0..<15 {
    let row = []
    for _ in 0..<15 {
      row.push(MapBlock::new()) // 每个MapBlock都是独立的
    }
    blocks.push(row)
  }

  // 中心点设置为怪物生成器
  blocks[7][7].occupant = Structure(
    Structure::new(
      structure_info_map["充能线圈"],
      owned=false,
      resource_type=None,
      (7, 7),
    ),
  )
  for i in 0..<default_enemy_count[level] {
    let enemy = summon_enemy(level)
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    // 将房间内的本地坐标转换为全局坐标
    let global_position = (
      index_position.0 + position.0,
      index_position.1 + position.1,
    )
    blocks[position.0][position.1].occupant = Occupant::Enemy(
      Enemy::new(enemy, global_position, false),
    )
  }
  // 生成 RefinedCopperIngot
  if @rand.check_probability(0.7) {
    println("生成精炼铜锭")
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    blocks[position.0][position.1].occupant = Occupant::Material(
      Material::new(refined_copper_ingot),
    )
  }
  // 生成 ResonantStarCrystal
  if @rand.check_probability(0.7) {
    println("生成共鸣星晶")
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    blocks[position.0][position.1].occupant = Occupant::Material(
      Material::new(resonant_star_crystal),
    )
  }
  { level, index_position, blocks }
}

///|
fn Room::is_full(room : Room) -> Bool {
  for blocks in room.blocks {
    for block in blocks {
      if block.occupant is Enemy(_) {
        return false
      }
    }
  }
  true
}

///|
fn Room::get_empty_positions(room : Room) -> Array[(Int, Int)] {
  let positions = []
  for block_x in 0..<15 {
    for block_y in 0..<15 {
      if room.blocks[block_x][block_y].occupant is Empty {
        positions.push((block_x, block_y))
      }
    }
  }
  positions
}

///|
fn Room::is_coord_in_room(room : Room, coord : (Int, Int)) -> Bool {
  let (x, y) = coord
  let (room_x, room_y) = room.index_position
  x >= room_x && x < room_x + 15 && y >= room_y && y < room_y + 15
}

///|
fn Room::get_room_direction_and_new_position(
  room : Room,
  coord : (Int, Int),
) -> (Direction, (Int, Int)) {
  let (x, y) = coord
  let (room_x, room_y) = room.index_position
  let relative_x = x - room_x
  let relative_y = y - room_y
  if relative_x < 0 {
    if relative_y < 0 {
      (LeftDown, (room_x - 15, room_y))
    } else if relative_y >= 15 {
      (LeftUp, (room_x - 15, room_y + 15))
    } else {
      (Left, (room_x - 15, room_y))
    }
  } else if relative_x >= 15 {
    if relative_y < 0 {
      (RightDown, (room_x + 15, room_y))
    } else if relative_y >= 15 {
      (RightUp, (room_x + 15, room_y + 15))
    } else {
      (Right, (room_x + 15, room_y))
    }
  } else if relative_y < 0 {
    (Down, (room_x, room_y - 15))
  } else {
    (Up, (room_x, room_y + 15))
  }
}
