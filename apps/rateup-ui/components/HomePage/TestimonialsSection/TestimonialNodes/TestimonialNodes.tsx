import { Popover, Text } from "@mantine/core";
import { testimonials } from "../constants";
import styles1 from "./TestimonialNodes.module.css";
import styles from "../TestimonialsSection.module.css";

type testimonialNodesProps = {
  discName: string;
  popoversState: any;
};

function TestimonialNodes({ discName, popoversState }: testimonialNodesProps) {
  const discTestimonials = testimonials[discName];
  const className = `${styles["person-avatar"]} ${
    styles[`${discName}-person-avatar`]
  }`;
  return (
    <>
      {discTestimonials.map((testimonialObj) => {
        const isNodeActive = popoversState[`${discName}_${testimonialObj.id}`];
        return (
          <Popover
            opened={isNodeActive}
            key={testimonialObj.id}
            classNames={styles1}
            width={400}
          >
            <Popover.Target>
              <div
                className={`${className} ${
                  isNodeActive ? styles["node-active"] : ""
                }`}
                data-disc={discName}
                data-id={testimonialObj.id}
              >
                <div className={styles["avatar-img-container"]}>
                  <img
                    src={testimonialObj.avatarUrl}
                    alt={testimonialObj.name}
                  />
                </div>
              </div>
            </Popover.Target>
            <Popover.Dropdown>
              <Text>{testimonialObj.testimonial}</Text>
              <div className={styles1["name-role-and-companylogo-container"]}>
                <div className={styles1["name-role"]}>
                  <p>{testimonialObj.name}</p>
                  <p>{testimonialObj.jobRole}</p>
                </div>
                <div className={styles1["compnaylogo"]}>
                  <img
                    src={testimonialObj.companyLogoUrl}
                    alt={testimonialObj.companyName}
                  />
                </div>
              </div>
            </Popover.Dropdown>
          </Popover>
        );
      })}
    </>
  );
}

export default TestimonialNodes;
