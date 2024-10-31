import React from 'react';

const Input = ({ id, type, value, onChange, required }) => {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
    />
  );
};

export default Input;