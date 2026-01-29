export interface Permission {
  id: string;
  roleName: string;

  viewProducts: boolean;
  addProducts: boolean;
  editProducts: boolean;
  deleteProducts: boolean;

  viewReports: boolean;
  addReports: boolean;
  editReports: boolean;
  deleteReports: boolean;

  viewOrders: boolean;
  addOrders: boolean;
  editOrders: boolean;
  deleteOrders: boolean;

  users?: User[]; // optional to avoid circular reference issues
}

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  accountType: "ADMIN" | "MANAGER" | "STAFF";
  password: string;
  createdAt: Date;
  updatedAt: Date;

  permissionId?: string | null;
  permission?: Permission | null;
}
