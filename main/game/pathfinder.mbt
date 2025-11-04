///|
priv struct PathFinderMap {
  map : Map[(Int, Int), Bool]
}

///|
fn PathFinderMap::new(map : Map_) -> PathFinderMap {
  let global_map = map.get_global_map()
  let path_finder_map = PathFinderMap::{ map: {} }
  for t in global_map {
    let (global_position, block) = t
    if block.occupant is Empty {
      path_finder_map.map.set(global_position, true)
    } else {
      path_finder_map.map.set(global_position, false)
    }
  }
  path_finder_map
}

///|
fn PathFinderMap::is_block_walkable(
  path_finder_map : PathFinderMap,
  position : (Int, Int),
) -> Bool {
  if path_finder_map.map.get(position) is Some(walkable) {
    walkable
  } else {
    false
  }
}

///|
fn generate_offset(range : Int) -> Array[(Int, Int)] {
  let offset = []
  for i in -range..=range {
    for j in -range..=range {
      if i != 0 || j != 0 {
        offset.push((i, j))
      }
    }
  }
  offset
}

///|
fn PathFinderMap::get_walkable_neighbors(
  path_finder_map : PathFinderMap,
  range : Int,
  position : (Int, Int),
) -> Array[(Int, Int)] {
  let offset = generate_offset(range)
  let neighbors = []
  for offset_ in offset {
    let neighbor = (position.0 + offset_.0, position.1 + offset_.1)
    if path_finder_map.is_block_walkable(neighbor) {
      neighbors.push(neighbor)
    }
  }
  neighbors
}

///|
priv struct PathNode {
  position : (Int, Int)
  mut g_cost : Int
  h_cost : Int
  mut f_cost : Int
}

///|
fn manhattan_distance(pos1 : (Int, Int), pos2 : (Int, Int)) -> Int {
  let dx = if pos1.0 > pos2.0 { pos1.0 - pos2.0 } else { pos2.0 - pos1.0 }
  let dy = if pos1.1 > pos2.1 { pos1.1 - pos2.1 } else { pos2.1 - pos1.1 }
  dx + dy
}

///|
fn PathFinderMap::get_next_step(
  path_finder_map : PathFinderMap,
  start : (Int, Int),
  end : (Int, Int),
  move_range : Int,
  attack_range : Int,
) -> (Int, Int)? {
  if start == end {
    return Some(start)
  }
  let open_list = [
    {
      position: start,
      g_cost: 0,
      h_cost: manhattan_distance(start, end),
      f_cost: manhattan_distance(start, end),
    },
  ]
  let closed_list = {}
  let came_from = {}
  while open_list.length() > 0 {
    let mut current_index = 0
    let mut current = open_list[0]
    for i in 1..<open_list.length() {
      if open_list[i].f_cost < current.f_cost {
        current = open_list[i]
        current_index = i
      }
    }
    open_list.remove(current_index) |> ignore
    closed_list.set(current.position, true)
    // 如果到达终点，或者当前位置在攻击范围内（可以攻击目标）
    let distance_to_end = manhattan_distance(current.position, end)
    if current.position == end || distance_to_end <= attack_range {
      let mut current_pos = current.position
      let mut next_step = current.position
      while came_from.get(current_pos) is Some(parent_pos) {
        next_step = current_pos
        current_pos = parent_pos
        if current_pos == start {
          break
        }
      }
      return Some(next_step)
    }
    let neighbors = path_finder_map.get_walkable_neighbors(
      move_range,
      current.position,
    )
    for neighbor in neighbors {
      if closed_list.get(neighbor) is Some(_) {
        continue
      }
      let tentative_g_cost = current.g_cost + 1
      let mut in_open_list = false
      let mut open_index = 0
      for i in 0..<open_list.length() {
        if open_list[i].position == neighbor {
          in_open_list = true
          open_index = i
          break
        }
      }
      if !in_open_list {
        let h_cost = manhattan_distance(neighbor, end)
        let f_cost = tentative_g_cost + h_cost
        open_list.push(PathNode::{
          position: neighbor,
          g_cost: tentative_g_cost,
          h_cost,
          f_cost,
        })
        came_from.set(neighbor, current.position)
      } else if tentative_g_cost < open_list[open_index].g_cost {
        open_list[open_index].g_cost = tentative_g_cost
        open_list[open_index].f_cost = tentative_g_cost +
          open_list[open_index].h_cost
        came_from.set(neighbor, current.position)
      }
    }
  }
  None
}
