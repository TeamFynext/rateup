import classNames from "classnames/bind";
import styles from "./PerfectSurveyForYourNeeds.module.css";
import { List, ListItem } from "@mantine/core";

const cx = classNames.bind(styles);

function FeaturesList({ featureStringsArr }) {
  return (
    <List className={cx("features-list")}>
      {featureStringsArr.map((listItemText) => {
        return (
          <ListItem
            className={cx("survey-features-list-item")}
            key={listItemText}
            icon={<img src="/images/gradient-sparkle.svg" alt="sparkle icon" />}
          >
            {listItemText}
          </ListItem>
        );
      })}
    </List>
  );
}

export default FeaturesList;
