export default {
  filename: {
    type: 'string',
    default: 'my-script.js',
  },
  script: {
    type: 'string',
    default: null,
    nullable: true,
    filterChange: false,
  },
  transpiled: {
    type: 'string',
    default: null,
    nullable: true,
    filterChange: false,
  },
};
