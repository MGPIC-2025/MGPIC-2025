///|
struct Room {
  level : Int
  index_position : (Int, Int)
  blocks : Array[Array[MapBlock]]
}

///|
let default_enemy_count = [0, 10, 15, 20, 25, 30, 30, 30, 30, 30, 30]

///|
fn summon_enemy(level : Int) -> Enemy {
  if level == 10 {
    // TODO: BOSS 生成的特殊逻辑
    Enemy::new(enemy_map["（BOSS）废械吞噬者 · 饕餮"])
  } else {
    let can_summon_enemy = enemy_list.filter(enemy => enemy.level <= level)
    let enemy = can_summon_enemy[@rand.summon_random_number(
        0,
        can_summon_enemy.length() - 1,
      )]
    Enemy::new(enemy)
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
pub fn Room::new(
  level : Int,
  index_position : (Int, Int),
  escape_set : Set[(Int, Int)],
) -> Room {
  let blocks = Array::make(16, Array::make(16, MapBlock::new()))
  // 中心点设置为怪物生成器
  let x : Set[Int] = Set::new()
  blocks[7][7].occupant = ChargingCoil
  for i in 0..<default_enemy_count[level] {
    let enemy = summon_enemy(level)
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    blocks[position.0][position.1].occupant = Occupant::Enemy(enemy)
  }
  // 生成 RefinedCopperIngot
  if @rand.check_probability(0.5) {
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    blocks[position.0][position.1].occupant = Material(RefinedCopperIngot)
  }
  // 生成 ResonantStarCrystal
  if @rand.check_probability(0.5) {
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    blocks[position.0][position.1].occupant = Material(ResonantStarCrystal)
  }
  { level, index_position, blocks }
}

///|
pub fn Room::is_coord_in_room(room : Room, coord : (Int, Int)) -> Bool {
  let (x, y) = coord
  let (room_x, room_y) = room.index_position
  x >= room_x && x < room_x + 15 && y >= room_y && y < room_y + 15
}

///|
enum Direction {
  Left
  Right
  Up
  Down
  LeftUp
  LeftDown
  RightUp
  RightDown
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
