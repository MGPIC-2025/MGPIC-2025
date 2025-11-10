///|
using @global_resource {type Item}

///|
let current_game : Ref[Game?] = Ref::new(None)

///|
priv struct Game {
  map : Map_
}

///|
fn Game::new() -> Game {
  Game::{ map: Map_::new(Set::from_array([(0, 3), (0, 4), (0, 5)])) }
}

///|
fn force_get_current_map() -> Map_ {
  current_game.val.unwrap().map
}
