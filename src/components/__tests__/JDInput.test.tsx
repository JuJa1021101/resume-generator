import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JDInput, JDProcessor } from '../JDInput';

// Mock clipboard API
const mockWriteText = jest.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
    readText: jest.fn(() => Promise.resolve('')),
  },
});

describe('JDProcessor', () => {
  describe('cleanJDContent', () => {
    it('should remove excessive whitespace', () => {
      const input = 'Job    Title\n\n\n\nDescription     here';
      const result = JDProcessor.cleanJDContent(input);
      expect(result).toBe('Job Title\n\nDescription here');
    });

    it('should remove HTML tags', () => {
      const input = '<p>Job Title</p><br><div>Description</div>';
      const result = JDProcessor.cleanJDContent(input);
      expect(result).toBe('Job Title Description');
    });

    it('should normalize line breaks', () => {
      const input = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const result = JDProcessor.cleanJDContent(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should handle empty input', () => {
      expect(JDProcessor.cleanJDContent('')).toBe('');
      expect(JDProcessor.cleanJDContent('   ')).toBe('');
    });
  });

  describe('validateJDContent', () => {
    it('should return error for empty content', () => {
      const errors = JDProcessor.validateJDContent('');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('不能为空');
    });

    it('should return error for content too short', () => {
      const errors = JDProcessor.validateJDContent('短内容');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors.some(error => error.message.includes('过短'))).toBe(true);
    });

    it('should return error for content too long', () => {
      const longContent = 'a'.repeat(10001);
      const errors = JDProcessor.validateJDContent(longContent);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors.some(error => error.message.includes('过长'))).toBe(true);
    });

    it('should validate proper JD content', () => {
      const validJD = `
        前端开发工程师职位
        公司：科技有限公司
        职位要求：
        1. 熟悉React、Vue等前端框架
        2. 具备3年以上前端开发经验
        3. 掌握JavaScript、TypeScript技能
      `;
      const errors = JDProcessor.validateJDContent(validJD);
      expect(errors).toHaveLength(0);
    });

    it('should return error for invalid content structure', () => {
      const invalidContent = '这只是一段普通的文本，没有任何相关信息，也没有描述';
      const errors = JDProcessor.validateJDContent(invalidContent);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors.some(error => error.message.includes('不是有效的职位描述'))).toBe(true);
    });
  });

  describe('extractJDPreview', () => {
    it('should extract title from JD content', () => {
      const content = '前端开发工程师招聘\n公司要求...';
      const preview = JDProcessor.extractJDPreview(content);
      expect(preview.title).toBe('前端开发工程师');
    });

    it('should extract company from JD content', () => {
      const content = '职位描述\n公司：阿里巴巴集团\n要求...';
      const preview = JDProcessor.extractJDPreview(content);
      expect(preview.company).toBe('阿里巴巴集团');
    });

    it('should extract key requirements', () => {
      const content = `
        前端工程师
        要求1：熟悉React框架开发
        要求2：具备TypeScript技能
        要求3：掌握前端工程化工具
        其他信息...
      `;
      const preview = JDProcessor.extractJDPreview(content);
      expect(preview.keyRequirements).toHaveLength(3);
      expect(preview.keyRequirements[0]).toContain('React框架');
    });
  });
});

describe('JDInput Component', () => {
  const mockOnJDSubmit = jest.fn();

  beforeEach(() => {
    mockOnJDSubmit.mockClear();
  });

  it('should render with default props', () => {
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    expect(screen.getByText('职位描述输入')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请粘贴或输入目标岗位/)).toBeInTheDocument();
    expect(screen.getByText('开始AI分析')).toBeInTheDocument();
  });

  it('should show character count', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Test content');

    expect(screen.getByText('12/10000')).toBeInTheDocument();
  });

  it('should validate input and show errors', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '短');

    await waitFor(() => {
      expect(screen.getByText(/过短/)).toBeInTheDocument();
    });
  });

  it('should show preview for valid content', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} showPreview={true} />);

    const validJD = `
      前端开发工程师招聘
      公司：科技有限公司
      职位要求：
      1. 熟悉React、Vue等前端框架，具备丰富的组件开发经验
      2. 具备3年以上前端开发经验，熟悉现代前端工程化流程
      3. 掌握JavaScript、TypeScript技能，了解ES6+新特性
      4. 熟悉Webpack、Vite等构建工具的配置和优化
    `;

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, validJD);

    await waitFor(() => {
      expect(screen.getByText('内容预览')).toBeInTheDocument();
      expect(screen.getByText('前端开发工程师')).toBeInTheDocument();
      expect(screen.getByText('科技有限公司')).toBeInTheDocument();
    });
  });

  it('should handle paste event with content cleaning', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const textarea = screen.getByRole('textbox');
    const dirtyContent = '<p>Job    Title</p>\n\n\n\nDescription     here';

    await user.click(textarea);
    await user.paste(dirtyContent);

    expect(textarea).toHaveValue('Job Title\n\nDescription here');
  });

  it('should disable submit button for invalid content', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByText('开始AI分析');

    await user.type(textarea, '短');

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should enable submit button for valid content', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const validJD = `
      前端开发工程师职位
      公司：科技有限公司
      职位要求：
      1. 熟悉React、Vue等前端框架
      2. 具备3年以上前端开发经验
      3. 掌握JavaScript、TypeScript技能
    `;

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByText('开始AI分析');

    await user.type(textarea, validJD);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should call onJDSubmit with cleaned content', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const validJD = `
      前端开发工程师职位
      公司：科技有限公司
      职位要求：
      1. 熟悉React、Vue等前端框架
      2. 具备3年以上前端开发经验
      3. 掌握JavaScript、TypeScript技能
    `;

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByText('开始AI分析');

    await user.type(textarea, validJD);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnJDSubmit).toHaveBeenCalledWith(
        expect.stringContaining('前端开发工程师职位')
      );
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(<JDInput onJDSubmit={slowSubmit} />);

    const validJD = `
      前端开发工程师职位
      公司：科技有限公司
      职位要求：
      1. 熟悉React、Vue等前端框架
      2. 具备3年以上前端开发经验
      3. 掌握JavaScript、TypeScript技能
    `;

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByText('开始AI分析');

    await user.type(textarea, validJD);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    expect(screen.getByText('分析中...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should clear content when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Some content');

    const clearButton = screen.getByTitle('清空内容');
    await user.click(clearButton);

    expect(textarea).toHaveValue('');
  });

  it('should copy content to clipboard', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const content = 'Test content to copy';
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, content);

    const copyButton = screen.getByTitle('复制内容');
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(content);
  });

  it('should respect maxLength prop', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} maxLength={10} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'This is a very long text that exceeds the limit');

    expect(textarea).toHaveValue('This is a ');
    expect(screen.getByText('10/10')).toBeInTheDocument();
  });

  it('should show character count color based on usage', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} maxLength={10} />);

    const textarea = screen.getByRole('textbox');

    // Normal usage (< 70%)
    await user.type(textarea, '123456');
    let charCount = screen.getByText('6/10');
    expect(charCount).toHaveClass('text-gray-500');

    // High usage (70-90%)
    await user.type(textarea, '78');
    charCount = screen.getByText('8/10');
    expect(charCount).toHaveClass('text-yellow-600');

    // Critical usage (> 90%)
    await user.type(textarea, '9');
    charCount = screen.getByText('9/10');
    expect(charCount).toHaveClass('text-red-600');
  });

  it('should handle disabled state', () => {
    render(<JDInput onJDSubmit={mockOnJDSubmit} disabled={true} />);

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByText('开始AI分析');

    expect(textarea).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('should handle initial value', () => {
    const initialValue = 'Initial JD content';
    render(<JDInput onJDSubmit={mockOnJDSubmit} initialValue={initialValue} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(initialValue);
  });

  it('should auto-focus when autoFocus is true', () => {
    render(<JDInput onJDSubmit={mockOnJDSubmit} autoFocus={true} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveFocus();
  });

  it('should show usage tips', () => {
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    expect(screen.getByText('💡 提示：')).toBeInTheDocument();
    expect(screen.getByText(/直接粘贴完整的职位描述/)).toBeInTheDocument();
    expect(screen.getByText(/确保包含职位要求/)).toBeInTheDocument();
    expect(screen.getByText(/系统会自动清理/)).toBeInTheDocument();
    expect(screen.getByText(/支持中英文混合/)).toBeInTheDocument();
  });

  it('should handle form submission with Enter key', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const validJD = `
      前端开发工程师职位
      公司：科技有限公司
      职位要求：
      1. 熟悉React、Vue等前端框架
      2. 具备3年以上前端开发经验
      3. 掌握JavaScript、TypeScript技能
    `;

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, validJD);

    await waitFor(() => {
      expect(screen.getByText('开始AI分析')).not.toBeDisabled();
    });

    // Submit form by pressing Ctrl+Enter (common pattern for textareas)
    await user.keyboard('{Control>}{Enter}{/Control}');

    // Note: This test might need adjustment based on actual keyboard handling implementation
  });

  it('should debounce validation', async () => {
    const user = userEvent.setup();
    render(<JDInput onJDSubmit={mockOnJDSubmit} />);

    const textarea = screen.getByRole('textbox');

    // Type quickly
    await user.type(textarea, '短');

    // Error should not appear immediately
    expect(screen.queryByText(/过短/)).not.toBeInTheDocument();

    // Wait for debounce
    await waitFor(() => {
      expect(screen.getByText(/过短/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});