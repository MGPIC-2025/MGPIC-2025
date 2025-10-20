///|
fn get_level_by_room_count(room_count : Int) -> Int {
  if room_count / 5 + 1 > 11 {
    11
  } else {
    room_count / 5 + 1
  }
}
