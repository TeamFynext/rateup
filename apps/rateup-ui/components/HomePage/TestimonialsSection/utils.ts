import styles from "./TestimonialsSection.module.css";

export const placeAvatarsOnCircle = (outerDiscRef) => {
  const outerDiscElement = outerDiscRef.current;

  const personAvatarElements = outerDiscElement.querySelectorAll(
    `.${styles["person-avatar"]}`,
  );

  let angle = 360 - 90;
  const dangle = 360 / 6;

  for (let i = 0; i < personAvatarElements.length; i++) {
    const personAvatar = personAvatarElements[i];
    const personAvatarParentElement = personAvatar.parentNode;
    // const dangle = 360 / personAvatarParentElement.childElementCount;
    angle += dangle;
    personAvatar.style.transform = `rotate(${angle}deg) translate(${
      personAvatarParentElement.clientWidth / 2
    }px) rotate(-${angle}deg)`;
  }
};

export let playTestimonialsInterval = null;
export const playTestimonials = (outerDiscRef, setPopoverStates) => {
  return (entries, observer) => {
    let currentPersonAvatarIndex = 1;
    let isTestimonialsSectionIntersecting = entries[0].isIntersecting;

    const personAvatarElements = outerDiscRef.current.querySelectorAll(
      `.${styles["person-avatar"]}`,
    );

    if (isTestimonialsSectionIntersecting && !playTestimonialsInterval) {
      playTestimonialsInterval = setInterval(() => {
        const { disc, id } =
          personAvatarElements[currentPersonAvatarIndex].dataset;
        setPopoverStates({ [`${disc}_${id}`]: true });

        currentPersonAvatarIndex += 1;

        if (currentPersonAvatarIndex === personAvatarElements.length) {
          currentPersonAvatarIndex = 0;
        }
      }, 5000);
    } else {
      clearInterval(playTestimonialsInterval);
      currentPersonAvatarIndex = 1;
      playTestimonialsInterval = null;
      setPopoverStates({ outerDisc_id1: true });
    }
  };
};
