const getOptions = (data: Array<{ id: string; name: string; activeInAnotherSurvey?: boolean }>) => {
  if (data) {
    return data.map(({ id, name, activeInAnotherSurvey }) => {
      return { label: name, value: id, activeInAnotherSurvey };
    });
  } else {
    return [];
  }
};

export { getOptions };
