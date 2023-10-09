import { Box } from "@mantine/core";
import classes from '../promotion.module.css'
export default function RightPanelRoot(props) {
  return (
    <Box
      className={`${classes.panel} ${classes.right}`}
      {...props}
    />
  )
}