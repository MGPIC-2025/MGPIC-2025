///|
pub let random : @random.Rand = @random.Rand::new()

///|
pub fn summon_random_number(min : Int, max : Int) -> Int {
  min + random.int(limit=max - min + 1)
}
