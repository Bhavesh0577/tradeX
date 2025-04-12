import React from 'react';
import { Button as ShadcnButton } from "@/components/ui/button";

interface CustomButtonProps {
    children: React.ReactNode;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

export function Button({
    children,
    variant,
    size,
    className,
    onClick,
    disabled,
    type = "button",
    ...props
}: CustomButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <ShadcnButton
            variant={variant}
            size={size}
            className={className}
            onClick={onClick}
            disabled={disabled}
            type={type}
            {...props}
        >
            {children}
        </ShadcnButton>
    );
} 