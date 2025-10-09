///|
struct IDPool {
  mut now : Int
}

///|
pub fn IDPool::new() -> IDPool {
  { now: 0 }
}

///|
pub fn IDPool::get_id(id_pool : IDPool) -> Int {
  id_pool.now += 1
  id_pool.now
}

///|
pub let msg_pool : IDPool = IDPool::new()

///|
pub let id_pool : IDPool = IDPool::new()
