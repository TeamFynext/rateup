export const offerList = {
  "5% Discount": "gift_01.jpg",
  "6% Discount": "gift_02.jpg",
  "7% Discount": "gift_03.jpg",
  "GDEW - GDOT Extended Warranty Or 5% Discount": "gift_05.jpg",
  "GDEW - GDOT Extended Warranty Or Smart Watch": "gift_06.jpg",
  "G Dot - Protection, Or Smart Watch": "gift_04.jpg",
  "Smart Watch": "gift_09.jpg",
  "Home Theatre": "gift_07.jpg",
  "Home Theatre & Smart Watch": "gift_08.jpg",
};
const offerArrayWithRange = [
  {
    range: [5000, 20000],
    gifts: [
      { image: "gift_01.jpg", name: "5% Discount" },
      { image: "gift_02.jpg", name: "6% Discount" },
      { image: "gift_03.jpg", name: "7% Discount" },
      {
        image: "gift_05.jpg",
        name: "GDEW - GDOT Extended Warranty Or 5% Discount",
      },
    ],
  },
  {
    range: [20000, 30000],
    gifts: [
      { image: "gift_01.jpg", name: "5% Discount" },
      { image: "gift_02.jpg", name: "6% Discount" },
      {
        image: "gift_06.jpg",
        name: "GDEW - GDOT Extended Warranty Or Smart Watch",
      },
      { image: "gift_04.jpg", name: "G Dot - Protection, Or Smart Watch" },
      { image: "gift_09.jpg", name: "Smart Watch" },
    ],
  },
  {
    range: [30000, 50000],
    gifts: [
      { image: "gift_01.jpg", name: "5% Discount" },
      { image: "gift_02.jpg", name: "6% Discount" },
      { image: "gift_03.jpg", name: "7% Discount" },
      {
        image: "gift_06.jpg",
        name: "GDEW - GDOT Extended Warranty Or Smart Watch",
      },
      { image: "gift_04.jpg", name: "G Dot - Protection, Or Smart Watch" },
      { image: "gift_09.jpg", name: "Smart Watch" },
    ],
  },
  {
    range: [50000, 70000],
    gifts: [
      { image: "gift_01.jpg", name: "5% Discount" },
      { image: "gift_02.jpg", name: "6% Discount" },
      { image: "gift_03.jpg", name: "7% Discount" },
      {
        image: "gift_06.jpg",
        name: "GDEW - GDOT Extended Warranty Or Smart Watch",
      },
      { image: "gift_04.jpg", name: "G Dot - Protection, Or Smart Watch" },
      { image: "gift_09.jpg", name: "Smart Watch" },
      { image: "gift_07.jpg", name: "Home Theatre" },
    ],
  },
  {
    range: [70000, 100000],
    gifts: [
      { image: "gift_01.jpg", name: "5% Discount" },
      { image: "gift_02.jpg", name: "6% Discount" },
      { image: "gift_03.jpg", name: "7% Discount" },
      {
        image: "gift_06.jpg",
        name: "GDEW - GDOT Extended Warranty Or Smart Watch",
      },
      { image: "gift_04.jpg", name: "G Dot - Protection, Or Smart Watch" },
      { image: "gift_09.jpg", name: "Smart Watch" },
      { image: "gift_07.jpg", name: "Home Theatre" },
    ],
  },
  {
    range: [100000, 100001],
    gifts: [
      { image: "gift_01.jpg", name: "5% Discount" },
      { image: "gift_02.jpg", name: "6% Discount" },
      { image: "gift_03.jpg", name: "7% Discount" },
      { image: "gift_04.jpg", name: "G Dot - Protection, Or Smart Watch" },
      { image: "gift_08.jpg", name: "Home Theatre & Smart Watch" },
    ],
  },
];

export function getRandomGift(price: number) {
  if (price > 100000) {
    price = 100000;
  }
  let range = offerArrayWithRange.find(
    (r) => price >= r.range[0] && price <= r.range[1],
  );
  if (!range) return null;

  return range.gifts[Math.floor(Math.random() * range.gifts.length)];
}
