const getOptions = (data) => {
  if (data) {
    return data.map(({ id, name, activeInAnotherSurvey }) => {
      return { label: name, value: id, activeInAnotherSurvey };
    });
  } else {
    return [];
  }
};

export { getOptions };
