// Next's bundler unwraps its CommonJS image export; mirror that for Node SSR tests.
import Image from 'next/image.js';
export default Image.default??Image;
