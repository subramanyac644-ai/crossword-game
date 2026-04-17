import { render } from '@testing-library/react';

import GameEngineCrosswordUi from './crossword-ui.js';

describe('GameEngineCrosswordUi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<GameEngineCrosswordUi />);
    expect(baseElement).toBeTruthy();
  });
});
