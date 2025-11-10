///|
/// 在指定地点放下一个铜偶
fn set_copper(copper : BattleCopper, id : Int, position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_copper",
    content: (
      { "id": id, "position": position, "copper": copper.to_json() } : Json).stringify(),
  })
}

///|
/// 在指定地点放下一个敌人
fn set_enemy(enemy : Enemy, id : Int, position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_enemy",
    content: (
      { "id": id, "position": position, "enemy": enemy.to_json() } : Json).stringify(),
  })
}

///|
fn set_structure(
  structure : Structure,
  id : Int,
  position : (Int, Int),
) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_structure",
    content: (
      { "id": id, "position": position, "structure": structure.to_json() } :
      Json).stringify(),
  })
}

///|
fn set_material(material : Material, id : Int, position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_material",
    content: (
      { "id": id, "position": position, "material": material.to_json() } : Json).stringify(),
  })
}

///|
/// 删除一个单位，我希望有一个删除动画，然后删除单位（比如缓缓消失）
fn remove_unit(id : Int) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "remove_unit",
    content: ({ "id": id } : Json).stringify(),
  })
}

///|
priv enum UnitDirection {
  PositiveX
  NegativeX
  PositiveY
  NegativeY
} derive(Show)

///|
/// 改变一个单位的朝向
fn change_direction(id : Int, direction : UnitDirection) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "change_direction",
    content: ({ "id": id, "direction": direction.to_string() } : Json).stringify(),
  })
}

///|
/// 移动一个单位到指定地点
fn move_to(id : Int, position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "move_to",
    content: ({ "id": id, "to": position } : Json).stringify(),
  })
}

///|
/// 显示一个单位的可移动状态，true 表示可移动，false 表示不可移动
/// 可以移动的时候我希望可以在单位脚下显示一个绿色圈圈，然后不可以移动的时候清除就好
/// 他和 display_can_attack 的圈圈最好可以叠加显示
fn display_can_move(id : Int, can_move : Bool) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "display_can_move",
    content: ({ "id": id, "can_move": can_move.to_string() } : Json).stringify(),
  })
}

///|
/// 显示一个单位的可攻击状态，true 表示可攻击，false 表示不可攻击
/// 可以攻击的时候我希望可以在单位脚下显示一个红色圈圈，然后不可以攻击的时候清除就好
/// 他和 display_can_move 的圈圈最好可以叠加显示
fn display_can_attack(id : Int, can_attack : Bool) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "display_can_attack",
    content: ({ "id": id, "can_attack": can_attack.to_string() } : Json).stringify(),
  })
}

///|
/// 显示一个单位的可召唤状态，true 表示可召唤，false 表示不可召唤
/// 可以召唤的时候我希望可以在单位脚下显示一个黄色圈圈，然后不可以召唤的时候清除就好
/// 他和 display_can_move 和 display_can_attack 的圈圈最好可以叠加显示
fn display_can_summon(id : Int, can_summon : Bool) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "display_can_summon",
    content: ({ "id": id, "can_summon": can_summon.to_string() } : Json).stringify(),
  })
}

///|
/// 显示一个单位的可建造状态，true 表示可建造，false 表示不可建造
/// 可以建造的时候我希望可以在单位脚下显示一个蓝色圈圈，然后不可以建造的时候清除就好
/// 他和 display_can_move 和 display_can_attack 和 display_can_summon 的圈圈最好可以叠加显示
fn display_can_build(id : Int, can_build : Bool) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "display_can_build",
    content: ({ "id": id, "can_build": can_build.to_string() } : Json).stringify(),
  })
}

///|
/// 清除一个单位的任何状态（包括可移动状态和可攻击状态）
fn clear_state(id : Int) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "clear_state",
    content: ({ "id": id } : Json).stringify(),
  })
}

///|
/// 把视角转移到一个单位身上
fn animate_move(id : Int) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "animate_move",
    content: ({ "id": id } : Json).stringify(),
  })
}

///|
/// 把视角复位
fn animate_reset() -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "animate_reset",
    content: ({} : Json).stringify(),
  })
}

///|
/// 在指定地点放下一个地图块，地图块可以先设计为灰色的，只是代表铜偶可以在这上面移动就好
fn put_map_block(position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "put_map_block",
    content: ({ "position": position } : Json).stringify(),
  })
}

///|
/// 批量放置地图块（优化性能，一次性创建整个房间的地板）
fn put_room_blocks(room_position : (Int, Int), size : Int) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "put_room_blocks",
    content: ({ "room_position": room_position, "size": size } : Json).stringify(),
  })
}

///|
/// 设置一个地图块为可移动状态，就是把它直接渲染为绿色就可以了
fn set_move_block(position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_move_block",
    content: ({ "position": position } : Json).stringify(),
  })
}

///|
/// 设置一个地图块为可攻击状态，就是把它直接渲染为红色就可以了
fn set_attack_block(position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_attack_block",
    content: ({ "position": position } : Json).stringify(),
  })
}

///|
/// 设置一个地图块为可召唤状态，就是把它直接渲染为黄色就可以了
fn set_can_summon_blocks(position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_can_summon_blocks",
    content: ({ "position": position } : Json).stringify(),
  })
}

///|
/// 设置一个地图块为可建造状态，就是把它直接渲染为蓝色就可以了
fn set_build_blocks(position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "set_build_blocks",
    content: ({ "position": position } : Json).stringify(),
  })
}

///|
/// 清除一个地图块的任何状态
fn clear_block(position : (Int, Int)) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "clear_block",
    content: ({ "position": position } : Json).stringify(),
  })
}

///|
/// 攻击完成
fn attack_complete(id : Int) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "attack_complete",
    content: ({ "id": id } : Json).stringify(),
  })
}

///|
/// 更新单位血量（用于显示血条）
fn update_health(id : Int, now_health : Float, max_health : Float) -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "update_health",
    content: (
      { "id": id, "now_health": now_health, "max_health": max_health } : Json).stringify(),
  })
}

///|
/// 游戏结束
fn game_over() -> Unit {
  @global_msg.msg_info.broadcast({
    type_msg: "game_over",
    content: ({} : Json).stringify(),
  })
}
