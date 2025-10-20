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
fn convert_direction_to_unit_direction(direction : Direction) -> UnitDirection {
  match direction {
    Left => NegativeX
    Right => PositiveX
    Up => PositiveY
    Down => NegativeY
    LeftUp | LeftDown | RightUp | RightDown => abort("Invalid direction")
  }
}

///|
/// 根据铜偶的当前位置和目标位置，获取移动后铜偶的朝向
fn get_direction_by_position(
  position_from : (Int, Int),
  position_to : (Int, Int),
) -> Direction {
  let relative_x = position_to.0 - position_from.0
  let relative_y = position_to.1 - position_from.1
  if relative_x != 0 {
    if relative_x < 0 {
      Left
    } else {
      Right
    }
  } else if relative_y < 0 {
    Down
  } else {
    Up
  }
}
