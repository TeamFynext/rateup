export function findCentroid(
  coords: { latitude: number; longitude: number }[],
) {
  const sum = coords.reduce(
    (acc, curr) => {
      return {
        latitude: acc.latitude + curr.latitude,
        longitude: acc.longitude + curr.longitude,
      };
    },
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: sum.latitude / coords.length,
    longitude: sum.longitude / coords.length,
  };
}
