import React, { useState, useEffect } from "react";

interface TypingButtonProps {
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  typingSpeed?: number;
  showTypingEffect?: boolean;
}

const TypingButton: React.FC<TypingButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = "",
  style = {},
  title = "",
  typingSpeed = 50,
  showTypingEffect = true,
}) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!showTypingEffect || disabled) {
      setDisplayText(children);
      setIsTyping(false);
      setCurrentIndex(0);
      return;
    }

    // Reset typing effect when text changes
    setIsTyping(true);
    setCurrentIndex(0);
    setDisplayText("");

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex >= children.length) {
          setIsTyping(false);
          clearInterval(interval);
          return prevIndex;
        }
        setDisplayText(children.slice(0, prevIndex + 1));
        return prevIndex + 1;
      });
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [children, disabled, showTypingEffect, typingSpeed]);

  // Add typing class for CSS effects
  const buttonClassName = `${className} ${isTyping ? "typing" : ""}`;

  const handleClick = () => {
    if (onClick && !disabled) {
      onClick();
    }
  };

  return (
    <button className={buttonClassName} onClick={handleClick} disabled={disabled} style={style} title={title}>
      {displayText}
      {isTyping && <span className="typing-cursor">|</span>}
    </button>
  );
};

export default TypingButton;
