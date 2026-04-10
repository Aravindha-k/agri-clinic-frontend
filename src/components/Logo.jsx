import React from "react";
import logo from "../assets/logo.png";

const Logo = ({
    className = "w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain",
    containerClassName = "",
    showShadow = true
}) => (
    <div className={`inline-flex items-center justify-center ${containerClassName} ${showShadow ? 'shadow-md hover:shadow-lg transition-shadow duration-300' : ''
        }`}>
        <img
            src={logo}
            alt="Kavya Agri Clinic Logo"
            className={className}
            loading="lazy"
            decoding="async"
        />
    </div>
);

export default Logo;