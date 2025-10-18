///|
pub fn cost_drop_item(items : Array[(Item, Double)]) -> Item? {
  let random = @rand.random
  let total_probability = items.fold(init=0.0, (sum, x) => sum + x.1)
  let random_value = random.double()
  if random_value > total_probability {
    None
  } else {
    let mut current_probability = 0.0
    for x in items {
      let (item, probability) = x
      current_probability += probability
      if random_value <= current_probability {
        return Some(item)
      }
    }
    None
  }
}
