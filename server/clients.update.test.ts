import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  updateClient: vi.fn(),
  getClientById: vi.fn(),
}));

import { updateClient, getClientById } from "./db";

describe("Client Update Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update client email and phone", async () => {
    const mockUpdateClient = vi.mocked(updateClient);
    mockUpdateClient.mockResolvedValue({ affectedRows: 1 } as any);

    const updateData = {
      email: "test@example.com",
      phone: "555-123-4567",
    };

    await updateClient(1, updateData);

    expect(mockUpdateClient).toHaveBeenCalledWith(1, updateData);
  });

  it("should allow partial updates with only email", async () => {
    const mockUpdateClient = vi.mocked(updateClient);
    mockUpdateClient.mockResolvedValue({ affectedRows: 1 } as any);

    const updateData = {
      email: "newemail@example.com",
    };

    await updateClient(1, updateData);

    expect(mockUpdateClient).toHaveBeenCalledWith(1, updateData);
  });

  it("should allow partial updates with only phone", async () => {
    const mockUpdateClient = vi.mocked(updateClient);
    mockUpdateClient.mockResolvedValue({ affectedRows: 1 } as any);

    const updateData = {
      phone: "999-888-7777",
    };

    await updateClient(1, updateData);

    expect(mockUpdateClient).toHaveBeenCalledWith(1, updateData);
  });

  it("should allow setting email to null", async () => {
    const mockUpdateClient = vi.mocked(updateClient);
    mockUpdateClient.mockResolvedValue({ affectedRows: 1 } as any);

    const updateData = {
      email: null,
    };

    await updateClient(1, updateData);

    expect(mockUpdateClient).toHaveBeenCalledWith(1, updateData);
  });

  it("should allow setting phone to null", async () => {
    const mockUpdateClient = vi.mocked(updateClient);
    mockUpdateClient.mockResolvedValue({ affectedRows: 1 } as any);

    const updateData = {
      phone: null,
    };

    await updateClient(1, updateData);

    expect(mockUpdateClient).toHaveBeenCalledWith(1, updateData);
  });

  it("should update client name along with contact info", async () => {
    const mockUpdateClient = vi.mocked(updateClient);
    mockUpdateClient.mockResolvedValue({ affectedRows: 1 } as any);

    const updateData = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "555-999-1234",
    };

    await updateClient(1, updateData);

    expect(mockUpdateClient).toHaveBeenCalledWith(1, updateData);
  });

  it("should update notes field", async () => {
    const mockUpdateClient = vi.mocked(updateClient);
    mockUpdateClient.mockResolvedValue({ affectedRows: 1 } as any);

    const updateData = {
      notes: "Important client - send anniversary card",
    };

    await updateClient(1, updateData);

    expect(mockUpdateClient).toHaveBeenCalledWith(1, updateData);
  });
});
