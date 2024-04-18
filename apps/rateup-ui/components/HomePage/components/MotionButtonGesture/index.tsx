import { motion } from "framer-motion";

function MotionButtonGesture({ children }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      style={{ width: "fit-content" }}
      layout={"size"}
    >
      {children}
    </motion.div>
  );
}

export default MotionButtonGesture;
