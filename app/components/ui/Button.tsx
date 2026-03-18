"use client";

import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button(props: Props) {
  return (
    <button
      {...props}
      style={{
        height: 44,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        transition: "all .2s ease",
        ...props.style,
      }}
      onMouseDown={(e) =>
        (e.currentTarget.style.transform = "scale(0.98)")
      }
      onMouseUp={(e) =>
        (e.currentTarget.style.transform = "scale(1)")
      }
    >
      {props.children}
    </button>
  );
}
