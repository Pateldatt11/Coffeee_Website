// export const coffeeMenu = [
//   { name: "Espresso", category: "Classic Espresso", price: 120, img: "https://img.freepik.com/free-photo/cup-coffee-table-grey-background_1220-7312.jpg?semt=ais_incoming&w=740&q=80" },
//   { name: "Double Espresso", category: "Classic Espresso", price: 140, img: "https://img.freepik.com/free-photo/double-espresso-side-view_141793-2814.jpg" },
//   { name: "Ristretto", category: "Classic Espresso", price: 130, img: "https://media.istockphoto.com/id/538323462/photo/cup-of-italian-ristretto-coffee.jpg?s=612x612&w=0&k=20&c=alleLpb8BPmmylNKE6-RHgBNi6aRNyL0cGVmrxQ1Ztc=" },
//   { name: "Lungo", category: "Classic Espresso", price: 130, img: "https://thumbs.dreamstime.com/b/espresso-coffee-two-glasses-dark-background-style-179415873.jpg" },
//   { name: "Americano", category: "Classic Espresso", price: 150, img: "https://plus.unsplash.com/premium_photo-1723559972702-2659e41dbb5b?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YW1lcmljYW5vJTIwY29mZmVlfGVufDB8fDB8fHww" },
//   { name: "Long Black", category: "Classic Espresso", price: 150, img: "https://www.nescafe.com/sites/default/files/2024-09/Nes_ConEco3.0_B2_Article25-WhatIsLongBlackCoffee_Image%206-1066%20%C3%97%20970.jpg" },
//   { name: "Macchiato", category: "Espresso + Milk", price: 160, img: "https://img.bestrecipes.com.au/X1OxZDPR/br/2021/05/macchiato-unsplash-962590-1.jpg" },
//   { name: "Cortado", category: "Espresso + Milk", price: 170, img: "https://cdn.shopify.com/s/files/1/0801/7530/0936/files/WK_Social_10062022_4_2048x2048.png?v=1711995048" },
//   { name: "Flat White", category: "Espresso + Milk", price: 180, img: "https://media.istockphoto.com/id/183138035/photo/cup-of-latte-coffee-and-spoon-on-gray-counter.jpg?s=612x612&w=0&k=20&c=Iht-hG2bzxiZgpjao6RELKAbw4oG7ujS2wQNkiM2rqU=" },
//   { name: "Cappuccino", category: "Espresso + Milk", price: 180, img: "https://img.freepik.com/free-photo/chocolate-cake-kartoshka-cappuccino-wooden-table_501050-980.jpg?semt=ais_incoming&w=740&q=80" },
//   { name: "Latte", category: "Espresso + Milk", price: 190, img: "https://images.unsplash.com/photo-1593443320739-77f74939d0da?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGF0dGV8ZW58MHx8MHx8fDA%3D" },
//   { name: "Caffè Latte", category: "Espresso + Milk", price: 190, img: "https://img.freepik.com/free-photo/latte-coffee-cup_74190-1194.jpg?semt=ais_incoming&w=740&q=80" },
//   { name: "Mocha", category: "Flavored", price: 210, img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQO6VqWHp861i-BLyScRylrsInoUKK6AyfzlQ&s" },
//   { name: "Caramel Macchiato", category: "Flavored", price: 220, img: "https://dinnerthendessert.com/wp-content/uploads/2023/10/Caramel-Macchiato-10.jpg" },
//   { name: "Vanilla Latte", category: "Flavored", price: 210, img: "https://t4.ftcdn.net/jpg/02/28/60/95/360_F_228609527_w4pqqtPojjXT1QKK6PWz7nw0LuOkwJDj.jpg" },
//   { name: "Café Miel", category: "Flavored", price: 200, img: "https://www.shutterstock.com/image-photo/tasty-sweet-salted-tahini-honeycomb-600nw-2693581627.jpg" },
//   { name: "Affogato", category: "Dessert Coffee", price: 230, img: "https://i.pinimg.com/736x/7b/07/ab/7b07ab00579092a32f6466570917b0d2.jpg" },
//   { name: "Frappuccino", category: "Blended/Iced", price: 260, img: "https://food.fnr.sndimg.com/content/dam/images/food/fullset/2023/3/27/chocolate-frappuccino.jpg.rend.hgtvcom.1280.960.85.suffix/1679946919979.webp" },
//   { name: "Cold Brew", category: "Cold Coffee", price: 200, img: "https://bakewithshivesh.com/wp-content/uploads/2021/04/IMG_3613-scaled.jpg" },
//   { name: "Iced Latte", category: "Cold Coffee", price: 210, img: "https://images.ctfassets.net/v601h1fyjgba/71VWCR6Oclk14tsdM9gTyM/6921cc6b21746f62846c99fa6a872c35/Iced_Latte.jpg" },
//   { name: "Iced Americano", category: "Cold Coffee", price: 190, img: "https://mocktail.net/wp-content/uploads/2022/03/homemade-Iced-Americano-recipe_1.jpg" },
//   { name: "Vietnamese Iced Coffee", category: "Regional", price: 180, img: "https://media.istockphoto.com/id/542212056/photo/ice-coffee-in-a-tall-glass-and-coffee-beans.jpg?s=612x612&w=0&k=20&c=lfw6nY_ZBt57XPtXN60Bx2Qy9Ga5nIokg995_Vy5EJ0=" },
//   { name: "Café Cubano", category: "Regional", price: 160, img: "https://media.istockphoto.com/id/476409643/photo/cuban-coffee-in-a-typical-cup.jpg?s=612x612&w=0&k=20&c=HP7CqrUac29SJ0b9Yjhb0nQcfCn1KtixJBogvPADA_E=" },
//   { name: "Irish Coffee", category: "Regional", price: 250, img: "https://www.pamperedchef.com/iceberg/com/recipe/2132757-lg.jpg" },
//   { name: "Turkish Coffee", category: "Regional", price: 170, img: "https://www.giverecipe.com/wp-content/uploads/2019/04/Turkish-coffee-making.jpg" },
//   { name: "Café au Lait", category: "Regional", price: 160, img: "https://thelocalpalate.com/wp-content/uploads/2022/06/CafeauLait_CLC-e1698840508955.jpg" },
//   { name: "Café de Olla", category: "Regional", price: 170, img: "https://www.espressomykitchen.com/wp-content/uploads/2024/09/espressomykitchen-cafe-de-olla-mexican-spiced-coffee-drink-4.jpg" },
//   { name: "Egg Coffee ", category: "Regional", price: 190, img: "https://images.immediate.co.uk/production/volatile/sites/30/2020/08/vietnamese-egg-coffee-7823671.jpg" },
//   { name: "Freddo Cappuccino", category: "Regional", price: 200, img: "https://img.freepik.com/free-photo/classic-latte-with-coffee-beans_140725-4585.jpg?semt=ais_hybrid&w=740&q=80" },
//   { name: "Espresso Freddo", category: "Regional", price: 180, img: "https://img.freepik.com/free-photo/refreshing-boozy-white-russian-cocktail-with-vodka-cream_123827-37413.jpg?semt=ais_hybrid&w=740&q=80" },
//   { name: "Café Bombon", category: "Regional", price: 175, img: "https://daveinspain.com/wp-content/uploads/2023/09/cafe-bombon-1.jpg" },
//   { name: "Café Con Leche", category: "Regional", price: 165, img: "https://www.shutterstock.com/image-photo/cafe-con-leche-coffee-milk-600nw-2596359497.jpg" },
//   { name: "Galão", category: "Regional", price: 170, img: "https://c8.alamy.com/comp/2A7M9AE/galao-portuguese-milk-coffee-drink-2A7M9AE.jpg" },
//   { name: "Kopi Joss", category: "Regional", price: 160, img: "https://img.freepik.com/free-photo/high-angle-tasty-coffee-with_23-2149600721.jpg?semt=ais_rp_50_assets&w=740&q=80" },
//   { name: "Yuanyang", category: "Regional", price: 175, img: "https://www.tasteatlas.com/images/ingredients/78c4f9479f2c4c779305b2e52bddec36.jpg" },
//   { name: "Café Touba", category: "Regional", price: 165, img: "https://thumbs.dreamstime.com/b/steaming-cup-spiced-coffee-likely-cafe-touba-senegal-served-rustic-ceramic-mug-surrounded-guinea-pepper-cloves-395720966.jpg" },
//   { name: "Mazagran", category: "Regional", price: 170, img: "https://t4.ftcdn.net/jpg/06/51/95/65/360_F_651956585_YzO5vHTCZXZinQ2ToDr0YDUeIfzoKg97.jpg" },
//   { name: "Café Zorro", category: "Regional", price: 160, img: "https://img.freepik.com/free-photo/latte-coffee_1122-2728.jpg" },
//   { name: "Red Eye", category: "Strong", price: 180, img: "https://www.acouplecooks.com/wp-content/uploads/2021/09/Red-Eye-Coffee-003.jpg" },
//   { name: "Black Eye", category: "Strong", price: 190, img: "https://cdn.shopify.com/s/files/1/0552/2672/8559/files/l-intro-1704989918_1.jpg?v=1774202986" },
//   { name: "Dead Eye", category: "Strong", price: 200, img: "https://s.yimg.com/ny/api/res/1.2/EpJ6wSWAJZUwzkj1QqJDTA--/YXBwaWQ9aGlnaGxhbmRlcjt3PTY0MDtoPTM1OQ--/https://media.zenfs.com/en/aol_tasting_table_516/5e01513a628a01aeeb2600b446f709ec" },
//   { name: "Nitro Cold Brew", category: "Modern", price: 280, img: "https://www.blenz.com/wp-content/uploads/2023/06/blenz-nitro-cold-brew.jpg" },
//   { name: "Pumpkin Spice Latte", category: "Seasonal", price: 240, img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT84xOUxirPpUoy2asEHykkJvMsE4VckTBobQ&s" },
//   { name: "Matcha Latte", category: "Alternatives", price: 220, img: "https://img.freepik.com/free-photo/matcha-latte-cup_417767-46.jpg?semt=ais_incoming&w=740&q=80" },
//   { name: "Chai Latte", category: "Alternatives", price: 180, img: "https://img.freepik.com/free-photo/cup-aroma-tasty-coffee-with-cinnamon-sticks-star-anise-high-quality-photo_114579-68924.jpg?semt=ais_incoming&w=740&q=80" },
//   { name: "Dirty Chai", category: "Alternatives", price: 200, img: "https://media.istockphoto.com/id/1480359250/photo/warm-dirty-chai-latte.jpg?s=612x612&w=0&k=20&c=flDB9EoyX8NS0_FEw-1oRPQTwGXx_TXrPsDWcF8KMcQ=" },
//   { name: "Bulletproof Coffee", category: "Specialty", price: 260, img: "https://cdn.shopify.com/s/files/1/0075/8251/5259/files/image2_abead41e-f946-4f50-aad4-550f38e1264d_1024x1024.jpg?v=1616560945" },
//   { name: "Dalgona Coffee", category: "Viral", price: 230, img: "https://espresso-works.com/cdn/shop/articles/espresso-works-blog-dalgona-coffee-1.jpg?v=1632388229" },
//   { name: "Spanish Coffee", category: "Flaming", price: 270, img: "https://img.freepik.com/premium-photo/frothy-creamy-spanish-caf-con-leche-coffee-ceramic-cup-with-saucer_1326686-2308.jpg?w=360" },
//   { name: "Café Brulot", category: "Flaming", price: 280, img: "https://static01.nyt.com/images/2023/02/08/multimedia/06bigapperex3-cafe-pqgb/06bigapperex3-cafe-pqgb-mediumSquareAt3X.jpg" },
// ];




// Coffee menu data.
// temp: "Hot" | "Cold" | "Both"
// sweetness: "None" | "Low" | "Medium" | "High" — this is the drink's
// natural/standard sweetness as typically served, not a rating.
export const coffeeMenu = [
  {
    name: "Espresso",
    category: "Classic Espresso",
    price: 120,
    img: "https://img.freepik.com/free-photo/cup-coffee-table-grey-background_1220-7312.jpg?semt=ais_incoming&w=740&q=80",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Finely ground coffee", "Hot water (pressure-extracted)"],
    description: "A concentrated 30ml shot pulled by forcing hot water through finely-ground, tightly-packed coffee at high pressure. Bold, intense, with a signature layer of crema on top."
  },
  {
    name: "Double Espresso",
    category: "Classic Espresso",
    price: 140,
    img: "https://img.freepik.com/free-photo/double-espresso-side-view_141793-2814.jpg",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Finely ground coffee (double dose)", "Hot water (pressure-extracted)"],
    description: "Also called a 'doppio' — two shots of espresso pulled together for double the volume and caffeine, same bold, syrupy intensity."
  },
  {
    name: "Ristretto",
    category: "Classic Espresso",
    price: 130,
    img: "https://media.istockphoto.com/id/538323462/photo/cup-of-italian-ristretto-coffee.jpg?s=612x612&w=0&k=20&c=alleLpb8BPmmylNKE6-RHgBNi6aRNyL0cGVmrxQ1Ztc=",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Finely ground coffee", "Hot water (short pull, less water)"],
    description: "A 'restricted' espresso pulled with about half the water of a regular shot. Shorter extraction means it's thicker, sweeter, and less bitter than a standard espresso."
  },
  {
    name: "Lungo",
    category: "Classic Espresso",
    price: 130,
    img: "https://thumbs.dreamstime.com/b/espresso-coffee-two-glasses-dark-background-style-179415873.jpg",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Finely ground coffee", "Hot water (extended pull, more water)"],
    description: "The opposite of a ristretto — a 'long' espresso pulled with roughly double the water, resulting in a milder, more diluted, slightly more bitter cup."
  },
  {
    name: "Americano",
    category: "Classic Espresso",
    price: 150,
    img: "https://plus.unsplash.com/premium_photo-1723559972702-2659e41dbb5b?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YW1lcmljYW5vJTIwY29mZmVlfGVufDB8fDB8fHww",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Espresso shot(s)", "Hot water"],
    description: "Espresso diluted with hot water to roughly the strength and volume of drip coffee, keeping the espresso's flavor but in a lighter, more approachable cup."
  },
  {
    name: "Long Black",
    category: "Classic Espresso",
    price: 150,
    img: "https://www.nescafe.com/sites/default/files/2024-09/Nes_ConEco3.0_B2_Article25-WhatIsLongBlackCoffee_Image%206-1066%20%C3%97%20970.jpg",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Hot water", "Espresso shot(s) poured on top"],
    description: "Hot water poured into the cup first, then espresso poured on top. Preserves the crema and gives a stronger, richer flavor than an Americano."
  },
  {
    name: "Macchiato",
    category: "Espresso + Milk",
    price: 160,
    img: "https://img.bestrecipes.com.au/X1OxZDPR/br/2021/05/macchiato-unsplash-962590-1.jpg",
    temp: "Hot",
    sweetness: "Low",
    ingredients: ["Espresso shot", "A small dollop of steamed milk foam"],
    description: "Espresso 'stained' (macchiato) with just a spoonful of milk foam — mostly espresso flavor with a soft touch of milk on top."
  },
  {
    name: "Cortado",
    category: "Espresso + Milk",
    price: 170,
    img: "https://cdn.shopify.com/s/files/1/0801/7530/0936/files/WK_Social_10062022_4_2048x2048.png?v=1711995048",
    temp: "Hot",
    sweetness: "Low",
    ingredients: ["Espresso shot", "Equal part warm steamed milk"],
    description: "Spanish in origin — espresso 'cut' with an equal amount of warm milk to soften the acidity while keeping the coffee flavor front and center."
  },
  {
    name: "Flat White",
    category: "Espresso + Milk",
    price: 180,
    img: "https://media.istockphoto.com/id/183138035/photo/cup-of-latte-coffee-and-spoon-on-gray-counter.jpg?s=612x612&w=0&k=20&c=Iht-hG2bzxiZgpjao6RELKAbw4oG7ujS2wQNkiM2rqU=",
    temp: "Hot",
    sweetness: "Low",
    ingredients: ["Double espresso", "Steamed milk with fine microfoam"],
    description: "A double shot topped with velvety microfoam milk (thinner than a cappuccino's foam), giving a smooth, strong, silky-textured coffee."
  },
  {
    name: "Cappuccino",
    category: "Espresso + Milk",
    price: 180,
    img: "https://img.freepik.com/free-photo/chocolate-cake-kartoshka-cappuccino-wooden-table_501050-980.jpg?semt=ais_incoming&w=740&q=80",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Espresso shot", "Steamed milk", "Thick milk foam (equal thirds)"],
    description: "Classic Italian drink built in equal thirds — espresso, steamed milk, and a thick cap of milk foam — for a rich, airy, balanced cup."
  },
  {
    name: "Latte",
    category: "Espresso + Milk",
    price: 190,
    img: "https://images.unsplash.com/photo-1593443320739-77f74939d0da?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGF0dGV8ZW58MHx8MHx8fDA%3D",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Espresso shot", "Steamed milk (large amount)", "Thin layer of foam"],
    description: "Espresso with a generous pour of steamed milk and just a thin layer of foam on top — the mildest, milkiest of the espresso drinks."
  },
  {
    name: "Caffè Latte",
    category: "Espresso + Milk",
    price: 190,
    img: "https://img.freepik.com/free-photo/latte-coffee-cup_74190-1194.jpg?semt=ais_incoming&w=740&q=80",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Espresso shot", "Steamed milk (large amount)", "Thin layer of foam"],
    description: "The Italian name for a latte — same espresso-and-steamed-milk build, smooth and milk-forward with a gentle coffee kick."
  },
  {
    name: "Mocha",
    category: "Flavored",
    price: 210,
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQO6VqWHp861i-BLyScRylrsInoUKK6AyfzlQ&s",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Espresso shot", "Chocolate syrup / cocoa", "Steamed milk", "Whipped cream (optional)"],
    description: "A latte with chocolate added — espresso, steamed milk, and chocolate syrup, often finished with whipped cream for a dessert-like coffee."
  },
  {
    name: "Caramel Macchiato",
    category: "Flavored",
    price: 220,
    img: "https://dinnerthendessert.com/wp-content/uploads/2023/10/Caramel-Macchiato-10.jpg",
    temp: "Both",
    sweetness: "High",
    ingredients: ["Vanilla syrup", "Steamed milk", "Espresso shot", "Caramel drizzle"],
    description: "Vanilla-sweetened steamed milk topped with an espresso shot and finished with a caramel drizzle — sweeter and creamier than a traditional macchiato."
  },
  {
    name: "Vanilla Latte",
    category: "Flavored",
    price: 210,
    img: "https://t4.ftcdn.net/jpg/02/28/60/95/360_F_228609527_w4pqqtPojjXT1QKK6PWz7nw0LuOkwJDj.jpg",
    temp: "Both",
    sweetness: "High",
    ingredients: ["Espresso shot", "Steamed milk", "Vanilla syrup"],
    description: "A classic latte sweetened with vanilla syrup — smooth, milky, and gently perfumed with vanilla."
  },
  {
    name: "Café Miel",
    category: "Flavored",
    price: 200,
    img: "https://www.shutterstock.com/image-photo/tasty-sweet-salted-tahini-honeycomb-600nw-2693581627.jpg",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Espresso shot", "Steamed milk", "Honey"],
    description: "'Honey coffee' — espresso and steamed milk sweetened with honey instead of syrup, for a warmer, more natural sweetness."
  },
  {
    name: "Affogato",
    category: "Dessert Coffee",
    price: 230,
    img: "https://i.pinimg.com/736x/7b/07/ab/7b07ab00579092a32f6466570917b0d2.jpg",
    temp: "Both",
    sweetness: "High",
    ingredients: ["Vanilla ice cream / gelato", "Hot espresso shot poured over"],
    description: "An Italian dessert-coffee — a scoop of vanilla gelato 'drowned' (affogato) in a hot espresso shot, melting into a sweet, creamy contrast."
  },
  {
    name: "Frappuccino",
    category: "Blended/Iced",
    price: 260,
    img: "https://food.fnr.sndimg.com/content/dam/images/food/fullset/2023/3/27/chocolate-frappuccino.jpg.rend.hgtvcom.1280.960.85.suffix/1679946919979.webp",
    temp: "Cold",
    sweetness: "High",
    ingredients: ["Coffee or espresso", "Milk", "Ice (blended)", "Flavored syrup", "Whipped cream (optional)"],
    description: "Coffee blended with ice, milk, and flavored syrup into a thick, milkshake-like drink, usually topped with whipped cream."
  },
  {
    name: "Cold Brew",
    category: "Cold Coffee",
    price: 200,
    img: "https://bakewithshivesh.com/wp-content/uploads/2021/04/IMG_3613-scaled.jpg",
    temp: "Cold",
    sweetness: "None",
    ingredients: ["Coarse ground coffee", "Cold/room-temp water (steeped 12–24 hrs)"],
    description: "Coarse coffee grounds steeped in cold water for 12–24 hours (no heat), producing a smooth, naturally sweet-tasting, low-acidity coffee concentrate served over ice."
  },
  {
    name: "Iced Latte",
    category: "Cold Coffee",
    price: 210,
    img: "https://images.ctfassets.net/v601h1fyjgba/71VWCR6Oclk14tsdM9gTyM/6921cc6b21746f62846c99fa6a872c35/Iced_Latte.jpg",
    temp: "Cold",
    sweetness: "Low",
    ingredients: ["Espresso shot", "Cold milk", "Ice"],
    description: "Espresso poured over ice and cold milk — the chilled version of a latte, refreshing with the same smooth espresso-milk balance."
  },
  {
    name: "Iced Americano",
    category: "Cold Coffee",
    price: 190,
    img: "https://mocktail.net/wp-content/uploads/2022/03/homemade-Iced-Americano-recipe_1.jpg",
    temp: "Cold",
    sweetness: "None",
    ingredients: ["Espresso shot(s)", "Cold water", "Ice"],
    description: "Espresso and cold water over ice — a crisp, chilled version of the Americano with no dairy and no sweetness."
  },
  {
    name: "Vietnamese Iced Coffee",
    category: "Regional",
    price: 180,
    img: "https://media.istockphoto.com/id/542212056/photo/ice-coffee-in-a-tall-glass-and-coffee-beans.jpg?s=612x612&w=0&k=20&c=lfw6nY_ZBt57XPtXN60Bx2Qy9Ga5nIokg995_Vy5EJ0=",
    temp: "Cold",
    sweetness: "High",
    ingredients: ["Strong dark-roast coffee (phin filter)", "Sweetened condensed milk", "Ice"],
    description: "Cà phê sữa đá — strong Vietnamese coffee slow-dripped through a phin filter directly over sweetened condensed milk, then poured over ice."
  },
  {
    name: "Café Cubano",
    category: "Regional",
    price: 160,
    img: "https://media.istockphoto.com/id/476409643/photo/cuban-coffee-in-a-typical-cup.jpg?s=612x612&w=0&k=20&c=HP7CqrUac29SJ0b9Yjhb0nQcfCn1KtixJBogvPADA_E=",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Espresso shot", "Sugar (whipped into 'espuma' with the first drops)"],
    description: "Sugar is whipped with the first drops of espresso into a thick, foamy 'espuma' and stirred through the rest of the shot — small, strong, and sweet."
  },
  {
    name: "Irish Coffee",
    category: "Regional",
    price: 250,
    img: "https://www.pamperedchef.com/iceberg/com/recipe/2132757-lg.jpg",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Hot brewed coffee", "Irish whiskey", "Sugar", "Lightly whipped cream on top"],
    description: "Hot coffee sweetened with sugar, spiked with Irish whiskey, and topped with a float of lightly whipped cream that's meant to be sipped through, not stirred in."
  },
  {
    name: "Turkish Coffee",
    category: "Regional",
    price: 170,
    img: "https://www.giverecipe.com/wp-content/uploads/2019/04/Turkish-coffee-making.jpg",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Very finely ground coffee", "Water", "Sugar (to taste, unfiltered)"],
    description: "Extra-finely ground coffee simmered (not filtered) with water and sugar-to-taste in a small pot called a cezve, served with the grounds settled at the bottom."
  },
  {
    name: "Café au Lait",
    category: "Regional",
    price: 160,
    img: "https://thelocalpalate.com/wp-content/uploads/2022/06/CafeauLait_CLC-e1698840508955.jpg",
    temp: "Hot",
    sweetness: "Low",
    ingredients: ["Brewed drip coffee (not espresso)", "Scalded/steamed milk (equal parts)"],
    description: "A French classic — strong brewed coffee combined with an equal amount of hot milk, milder and less concentrated than an espresso-based latte."
  },
  {
    name: "Café de Olla",
    category: "Regional",
    price: 170,
    img: "https://www.espressomykitchen.com/wp-content/uploads/2024/09/espressomykitchen-cafe-de-olla-mexican-spiced-coffee-drink-4.jpg",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Coarse ground coffee", "Cinnamon stick", "Piloncillo (raw cane sugar)", "Water"],
    description: "Mexican coffee simmered in a clay pot with cinnamon and piloncillo (unrefined cane sugar), giving it a warm, spiced sweetness."
  },
  {
    name: "Egg Coffee",
    category: "Regional",
    price: 190,
    img: "https://images.immediate.co.uk/production/volatile/sites/30/2020/08/vietnamese-egg-coffee-7823671.jpg",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Strong Vietnamese coffee", "Egg yolk", "Sugar / condensed milk (whipped)"],
    description: "Cà phê trứng — egg yolk whipped with condensed milk and sugar into a thick, custard-like foam, spooned over strong hot coffee."
  },
  {
    name: "Freddo Cappuccino",
    category: "Regional",
    price: 200,
    img: "https://img.freepik.com/free-photo/classic-latte-with-coffee-beans_140725-4585.jpg?semt=ais_hybrid&w=740&q=80",
    temp: "Cold",
    sweetness: "Medium",
    ingredients: ["Espresso (shaken/frappe'd with ice)", "Cold frothed milk"],
    description: "A Greek iced classic — chilled, frothed espresso topped with a layer of cold whipped milk foam, no hot milk involved."
  },
  {
    name: "Espresso Freddo",
    category: "Regional",
    price: 180,
    img: "https://img.freepik.com/free-photo/refreshing-boozy-white-russian-cocktail-with-vodka-cream_123827-37413.jpg?semt=ais_hybrid&w=740&q=80",
    temp: "Cold",
    sweetness: "None",
    ingredients: ["Espresso shot(s)", "Ice (shaken)"],
    description: "The Greek iced espresso — freshly pulled espresso shaken hard with ice until frothy on top, served with no milk for a pure, cold coffee hit."
  },
  {
    name: "Café Bombón",
    category: "Regional",
    price: 175,
    img: "https://daveinspain.com/wp-content/uploads/2023/09/cafe-bombon-1.jpg",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Espresso shot", "Sweetened condensed milk (layered, not stirred)"],
    description: "A Spanish drink served in a clear glass — espresso poured over sweetened condensed milk in visible layers, sweet and rich."
  },
  {
    name: "Café Con Leche",
    category: "Regional",
    price: 165,
    img: "https://www.shutterstock.com/image-photo/cafe-con-leche-coffee-milk-600nw-2596359497.jpg",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Strong brewed coffee or espresso", "Hot milk (roughly equal parts)", "Sugar (often to taste)"],
    description: "Spanish/Latin American 'coffee with milk' — strong coffee mixed with an equal amount of hot milk, usually sweetened."
  },
  {
    name: "Galão",
    category: "Regional",
    price: 170,
    img: "https://c8.alamy.com/comp/2A7M9AE/galao-portuguese-milk-coffee-drink-2A7M9AE.jpg",
    temp: "Hot",
    sweetness: "Low",
    ingredients: ["Espresso shot", "Frothed milk (large amount, tall glass)"],
    description: "A Portuguese milk-coffee served in a tall glass — mostly frothed milk with a shot of espresso, lighter than a latte."
  },
  {
    name: "Kopi Joss",
    category: "Regional",
    price: 160,
    img: "https://img.freepik.com/free-photo/high-angle-tasty-coffee-with_23-2149600721.jpg?semt=ais_rp_50_assets&w=740&q=80",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Ground robusta coffee", "Sugar", "Hot water", "A piece of burning charcoal"],
    description: "An Indonesian street-coffee specialty — sweetened black coffee with a live piece of burning charcoal dropped in, said to smooth out the acidity."
  },
  {
    name: "Yuanyang",
    category: "Regional",
    price: 175,
    img: "https://www.tasteatlas.com/images/ingredients/78c4f9479f2c4c779305b2e52bddec36.jpg",
    temp: "Both",
    sweetness: "Medium",
    ingredients: ["Brewed coffee", "Hong Kong-style milk tea (black tea + evaporated milk)"],
    description: "A Hong Kong fusion drink mixing brewed coffee with milk tea, blending coffee's bitterness with the tea's malty, milky sweetness."
  },
  {
    name: "Café Touba",
    category: "Regional",
    price: 165,
    img: "https://thumbs.dreamstime.com/b/steaming-cup-spiced-coffee-likely-cafe-touba-senegal-served-rustic-ceramic-mug-surrounded-guinea-pepper-cloves-395720966.jpg",
    temp: "Hot",
    sweetness: "Medium",
    ingredients: ["Coffee beans roasted with Guinea pepper (djar)", "Cloves", "Sugar"],
    description: "A Senegalese specialty made from coffee beans roasted with Guinea pepper and cloves, giving it a distinct peppery-spiced aroma."
  },
  {
    name: "Mazagran",
    category: "Regional",
    price: 170,
    img: "https://t4.ftcdn.net/jpg/06/51/95/65/360_F_651956585_YzO5vHTCZXZinQ2ToDr0YDUeIfzoKg97.jpg",
    temp: "Cold",
    sweetness: "Medium",
    ingredients: ["Strong coffee or espresso", "Sugar", "Water/ice", "Lemon (optional)"],
    description: "One of the oldest iced-coffee recipes, originating in Algeria and popular in Portugal — sweetened coffee served over ice, sometimes with a hint of lemon."
  },
  {
    name: "Café Zorro",
    category: "Regional",
    price: 160,
    img: "https://img.freepik.com/free-photo/latte-coffee_1122-2728.jpg",
    temp: "Hot",
    sweetness: "Low",
    ingredients: ["Brewed black coffee", "Sugar (optional, to taste)"],
    description: "A simple, no-frills black coffee — brewed and served straight, letting the bean's natural flavor lead."
  },
  {
    name: "Red Eye",
    category: "Strong",
    price: 180,
    img: "https://www.acouplecooks.com/wp-content/uploads/2021/09/Red-Eye-Coffee-003.jpg",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Drip coffee", "One espresso shot"],
    description: "Drip coffee with a shot of espresso added for an extra caffeine kick — favored by anyone pulling an all-nighter."
  },
  {
    name: "Black Eye",
    category: "Strong",
    price: 190,
    img: "https://cdn.shopify.com/s/files/1/0552/2672/8559/files/l-intro-1704989918_1.jpg?v=1774202986",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Drip coffee", "Two espresso shots"],
    description: "A step up from the Red Eye — drip coffee with two shots of espresso for a serious caffeine boost."
  },
  {
    name: "Dead Eye",
    category: "Strong",
    price: 200,
    img: "https://s.yimg.com/ny/api/res/1.2/EpJ6wSWAJZUwzkj1QqJDTA--/YXBwaWQ9aGlnaGxhbmRlcjt3PTY0MDtoPTM1OQ--/https://media.zenfs.com/en/aol_tasting_table_516/5e01513a628a01aeeb2600b446f709ec",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Drip coffee", "Three espresso shots"],
    description: "The strongest of the 'eye' drinks — drip coffee loaded with three espresso shots, for maximum caffeine with minimum sweetness."
  },
  {
    name: "Nitro Cold Brew",
    category: "Modern",
    price: 280,
    img: "https://www.blenz.com/wp-content/uploads/2023/06/blenz-nitro-cold-brew.jpg",
    temp: "Cold",
    sweetness: "None",
    ingredients: ["Cold brew coffee", "Infused nitrogen gas"],
    description: "Cold brew coffee infused with nitrogen gas and poured from a pressurized tap, giving it a creamy, cascading texture and naturally sweet mouthfeel without any dairy or sugar."
  },
  {
    name: "Pumpkin Spice Latte",
    category: "Seasonal",
    price: 240,
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT84xOUxirPpUoy2asEHykkJvMsE4VckTBobQ&s",
    temp: "Both",
    sweetness: "High",
    ingredients: ["Espresso shot", "Steamed milk", "Pumpkin spice syrup", "Whipped cream & cinnamon topping"],
    description: "A latte flavored with pumpkin spice syrup (cinnamon, nutmeg, clove) and usually finished with whipped cream and a cinnamon dusting."
  },
  {
    name: "Matcha Latte",
    category: "Alternatives",
    price: 220,
    img: "https://img.freepik.com/free-photo/matcha-latte-cup_417767-46.jpg?semt=ais_incoming&w=740&q=80",
    temp: "Both",
    sweetness: "Medium",
    ingredients: ["Matcha green tea powder (whisked)", "Steamed or cold milk", "Sweetener (optional)"],
    description: "A caffeine-free-of-coffee alternative — whisked matcha green tea powder combined with steamed or cold milk, earthy and lightly sweet."
  },
  {
    name: "Chai Latte",
    category: "Alternatives",
    price: 180,
    img: "https://img.freepik.com/free-photo/cup-aroma-tasty-coffee-with-cinnamon-sticks-star-anise-high-quality-photo_114579-68924.jpg?semt=ais_incoming&w=740&q=80",
    temp: "Both",
    sweetness: "Medium",
    ingredients: ["Spiced black tea concentrate (cinnamon, cardamom, ginger, cloves)", "Steamed milk", "Sweetener"],
    description: "A no-coffee option — spiced black tea concentrate combined with steamed milk, warming and aromatic with cinnamon and cardamom notes."
  },
  {
    name: "Dirty Chai",
    category: "Alternatives",
    price: 200,
    img: "https://media.istockphoto.com/id/1480359250/photo/warm-dirty-chai-latte.jpg?s=612x612&w=0&k=20&c=flDB9EoyX8NS0_FEw-1oRPQTwGXx_TXrPsDWcF8KMcQ=",
    temp: "Both",
    sweetness: "Medium",
    ingredients: ["Chai tea concentrate", "Steamed milk", "One espresso shot"],
    description: "A chai latte 'dirtied' with a shot of espresso — combines chai's warm spice with a genuine coffee kick."
  },
  {
    name: "Bulletproof Coffee",
    category: "Specialty",
    price: 260,
    img: "https://cdn.shopify.com/s/files/1/0075/8251/5259/files/image2_abead41e-f946-4f50-aad4-550f38e1264d_1024x1024.jpg?v=1616560945",
    temp: "Hot",
    sweetness: "None",
    ingredients: ["Black coffee", "Unsalted butter / ghee", "MCT oil (blended together)"],
    description: "Black coffee blended (not stirred) with butter and MCT oil until frothy — a high-fat, no-sugar, no-milk coffee popular in keto diets."
  },
  {
    name: "Dalgona Coffee",
    category: "Viral",
    price: 230,
    img: "https://espresso-works.com/cdn/shop/articles/espresso-works-blog-dalgona-coffee-1.jpg?v=1632388229",
    temp: "Both",
    sweetness: "High",
    ingredients: ["Instant coffee", "Sugar", "Hot water (whipped together)", "Milk (base)"],
    description: "Instant coffee, sugar, and hot water whipped until light and fluffy, then spooned over a glass of milk — the 2020 viral whipped coffee trend."
  },
  {
    name: "Spanish Coffee",
    category: "Flaming",
    price: 270,
    img: "https://img.freepik.com/premium-photo/frothy-creamy-spanish-caf-con-leche-coffee-ceramic-cup-with-saucer_1326686-2308.jpg?w=360",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Rum & triple sec (flambéed with sugar)", "Hot coffee", "Whipped cream"],
    description: "A theatrical tableside drink — rum and triple sec are flambéed with sugar around the glass rim, then combined with hot coffee and topped with whipped cream."
  },
  {
    name: "Café Brulot",
    category: "Flaming",
    price: 280,
    img: "https://static01.nyt.com/images/2023/02/08/multimedia/06bigapperex3-cafe-pqgb/06bigapperex3-cafe-pqgb-mediumSquareAt3X.jpg",
    temp: "Hot",
    sweetness: "High",
    ingredients: ["Brandy", "Orange & lemon peel", "Cloves, cinnamon", "Sugar (flambéed)", "Black coffee"],
    description: "A New Orleans specialty — brandy, citrus peel, and warm spices are flambéed with sugar, then mixed with strong black coffee, traditionally served in a punch bowl."
  }
];