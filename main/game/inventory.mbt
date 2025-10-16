// using @resource{type ResourceType}
// using @equipment{type Equipment}

// enum Items{
//   Resource(ResourceType)
//   Equipment(Equipment)
// } derive(Eq)

// struct Inventory {
//   capacity:Int
//   items:FixedArray[Items]
// }

// fn Inventory::new(capacity:Int) -> Inventory {
//   { capacity, items:[] }
// }

// fn Inventory::check_can_add_item(inventory:Inventory, item:Items) -> Bool {
//   if inventory.items.length() < inventory.capacity {
//     return true
//   }
//   for item_ in inventory.items {
//     if item_ is Resource(_) && item_ == item {
//       return true
//     } 
//   }
//   false
// }

// fn Inventory::add_item(inventory:Inventory, item:Items) -> Unit {
  
// }