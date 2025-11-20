"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Loader2, Edit3, Trash2 } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  phoneNumber: z
    .string()
    .min(5, "Phone number is required")
    .max(25, "Phone number is too long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

type ManagedUser = {
  id: Id<"users">;
  name: string;
  email: string;
  phoneNumber: string;
  role: "driver" | "frontdesk";
  hasPassword: boolean;
};

type UserManagementPageProps = {
  entityType: "driver" | "frontdesk";
};

export function UserManagementPage({ entityType }: UserManagementPageProps) {
  const entityLabel = entityType === "driver" ? "Driver" : "Frontdesk";
  const entityPluralLabel =
    entityType === "driver" ? "Drivers" : "Frontdesk Staff";
  const entityCollectionLabel =
    entityType === "driver" ? "drivers" : "frontdesk staff";

  const { user: sessionUser, status: sessionStatus } = useAuthSession();
  const isAdmin =
    sessionUser?.role === "admin" || sessionUser?.role === "superadmin";
  const isAuthLoading = sessionStatus === "loading";

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [activeUser, setActiveUser] = useState<ManagedUser | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [pageStack, setPageStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
    },
  });

let queryError: string | null = null;
let usersData:
  | {
      staff: ManagedUser[];
      nextCursor: string | null;
    }
  | undefined;

  useEffect(() => {
    setPageStack([null]);
    setPageIndex(0);
  }, [entityType]);

  const currentCursor = pageStack[pageIndex] ?? null;

  try {
    usersData = useQuery(api.users.listStaffByRole, {
      role: entityType,
      limit: pageSize,
      cursor: currentCursor ?? undefined,
    });
} catch (error: any) {
  usersData = { staff: [], nextCursor: null };
    queryError = error.message ?? "Failed to load users";
  }

  const createStaffAccount = useAction(api.users.createStaffAccount);
  const updateStaffAccount = useAction(api.users.updateStaffAccount);
  const deleteStaffAccount = useAction(api.users.deleteStaffAccount);

  const filteredUsers = useMemo(() => {
    const list = usersData?.staff ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return list;
    }

    return list.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phoneNumber.toLowerCase().includes(query)
    );
  }, [searchQuery, usersData]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setRequestError(null);

    const trimmed = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phoneNumber: values.phoneNumber.trim(),
      password: values.password?.trim() ?? "",
    };

    try {
      if (dialogMode === "create") {
        if (!trimmed.password) {
          setRequestError("Password is required for new users");
          return;
        }

        await createStaffAccount({
          ...trimmed,
          role: entityType,
        });
      } else if (activeUser) {
        await updateStaffAccount({
          userId: activeUser.id,
          name: trimmed.name,
          email: trimmed.email,
          phoneNumber: trimmed.phoneNumber,
          password: trimmed.password || undefined,
        });
      }

      form.reset({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
      });
      setActiveUser(null);
      setIsDialogOpen(false);
    } catch (error: any) {
      setRequestError(error.message ?? "Failed to save user");
    }
  });

  const handleAddClick = () => {
    setDialogMode("create");
    setActiveUser(null);
    form.reset({
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (user: ManagedUser) => {
    setDialogMode("edit");
    setActiveUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (user: ManagedUser) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteError(null);
    setPendingDeleteId(userToDelete.id);
    try {
      await deleteStaffAccount({ userId: userToDelete.id });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      setDeleteError(error.message ?? "Failed to delete user");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleNextPage = () => {
    if (!usersData?.nextCursor) return;
    setPageStack((stack) => {
      const nextStack = stack.slice(0, pageIndex + 1);
      nextStack.push(usersData.nextCursor);
      return nextStack;
    });
    setPageIndex((index) => index + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((index) => Math.max(0, index - 1));
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            Only administrators can manage {entityCollectionLabel}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">
          {entityLabel} Management
        </h1>
        <p className="text-muted-foreground">
          Search, add, and manage your {entityCollectionLabel} in one place.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full max-w-sm">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                placeholder={`Search ${entityPluralLabel}`}
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddClick} disabled={!isAdmin}>
                <Plus className="size-4" />
                Add {entityLabel}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create"
                    ? `Add a new ${entityLabel.toLowerCase()}`
                    : `Edit ${entityLabel.toLowerCase()}`}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? "Provide the basic details. Users can authenticate with a password or continue with Google using the same email address."
                    : "Update details or issue a new temporary password. Leave password blank to keep the current one."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Alex Smith" autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="alex@example.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+1 555 000 0000"
                            autoComplete="tel"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {dialogMode === "create"
                            ? "Temporary Password"
                            : "Reset Password (optional)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {requestError ? (
                    <p className="text-destructive text-sm">{requestError}</p>
                  ) : null}
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {dialogMode === "create" ? "Saving..." : "Updating..."}
                        </>
                      ) : dialogMode === "create" ? (
                        <>Create {entityLabel}</>
                      ) : (
                        <>Update {entityLabel}</>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {queryError ? (
            <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              {queryError}
            </div>
          ) : null}
          {deleteError ? (
            <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              {deleteError}
            </div>
          ) : null}
          <div className="rounded-lg border">
            {usersData === undefined ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading {entityCollectionLabel}...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No {entityCollectionLabel} match your search.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div>{user.name}</div>
                        <p className="text-muted-foreground text-xs">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.email}</div>
                        <p className="text-muted-foreground text-xs">
                          {user.phoneNumber || "Not provided"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary">Active</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${user.name}`}
                          onClick={() => handleEditClick(user)}
                          disabled={!isAdmin}
                        >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${user.name}`}
                            onClick={() => handleDeleteRequest(user)}
                            disabled={!isAdmin}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <Pagination className="border-t pt-4">
            <PaginationContent className="flex w-full items-center justify-between">
              <PaginationItem className="text-muted-foreground text-sm">
                Page {pageIndex + 1}
              </PaginationItem>
              <div className="flex items-center gap-2">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (pageIndex > 0 && usersData !== undefined) {
                        handlePrevPage();
                      }
                    }}
                    className={
                      pageIndex === 0 || usersData === undefined
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (usersData?.nextCursor) {
                        handleNextPage();
                      }
                    }}
                    className={
                      !usersData?.nextCursor
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>
              </div>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {userToDelete?.name}</DialogTitle>
            <DialogDescription>
              This action permanently removes the account. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <div className="text-destructive rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
              {deleteError}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={pendingDeleteId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={pendingDeleteId !== null}
            >
              {pendingDeleteId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

