export default {
  filename: {
    type: 'string',
    default: 'my-script.js',
  },
  source: {
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
  formattedError: {
    type: 'string',
    default: null,
    nullable: true,
    filterChange: false,
  },
  error: {
    type: 'any',
    default: null,
    nullable: true,
    filterChange: false,
  },
};
