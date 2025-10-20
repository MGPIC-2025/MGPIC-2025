///|
let current_game : Ref[Game?] = Ref::new(None)

///|
struct Game {
  map : Map_
}

///|
fn Game::new() -> Game {
  Game::{ map: Map_::new(Set::from_array([(0, 6), (0, 7), (0, 8)])) }
}

///|
pub fn force_get_current_map() -> Map_ {
  current_game.val.unwrap().map
}
