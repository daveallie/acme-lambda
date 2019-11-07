export const zip = (arr1, arr2) => arr1.map((k, i) => [k, arr2[i]]);

export const asyncFilter = async (arr, filterFn) => {
  const arrWithFilterVal = await Promise.all(
    arr.map(async el => [el, await filterFn(el)])
  );
  return arrWithFilterVal
    .filter(([, shouldKeep]) => shouldKeep)
    .map(([el]) => el);
};
