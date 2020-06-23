export default {
  presets: [
    ["@babel/preset-env",
      {
        targets: 'ios >= 9, not ie 11, not op_mini all'
      }
    ]
  ],
  plugins: [
    ['@babel/plugin-transform-arrow-functions'],
  ],
}
