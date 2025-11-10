///|
fn get_level_by_room_count(room_count : Int) -> Int {
  if room_count / 4 + 1 >= 6 {
    6
  } else {
    room_count / 4 + 1
  }
}
