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
/// 映射规则（基于前端期望）：
/// - X+ (向右) → 保持朝向+Z(0度) → 发送Up
/// - Y+ (向上) → 转到90度 → 发送Right
/// - Y- (向下) → 转到-90度 → 发送Left
/// - X- (向左) → 转到180度 → 发送Down
fn get_direction_by_position(
  position_from : (Int, Int),
  position_to : (Int, Int),
) -> Direction {
  let relative_x = position_to.0 - position_from.0
  let relative_y = position_to.1 - position_from.1
  if relative_x != 0 {
    if relative_x > 0 {
      // X+ (向右) → 发送Up (前端保持0度朝向+Z)
      Up
    } else {
      // X- (向左) → 发送Down (前端转到180度朝向-Z)
      Down
    }
  } else if relative_y > 0 {
    // Y+ (向上) → 发送Left (前端转到-90度)
    Left
  } else {
    // Y- (向下) → 发送Right (前端转到90度)
    Right
  }
}
