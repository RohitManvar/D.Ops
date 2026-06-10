export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02, // Ultra fast stagger
      delayChildren: 0,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 }, // Even less distance to travel
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 600, // Extremely snappy
      damping: 25, 
    } 
  },
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25 
    } 
  },
};
