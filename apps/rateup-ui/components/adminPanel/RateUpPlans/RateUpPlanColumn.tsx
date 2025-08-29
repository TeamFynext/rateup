import { IconTrash } from "@tabler/icons-react";
import {
  GridActionsCellItem,
  GridColDef,
  GridPreProcessEditCellProps,
  GridRowId,
} from "@mui/x-data-grid";

import { renderFeatures } from "../../../app/admin/subscriptions/page";
import styles from "../../../components/adminPanel/admin.module.css";
import { PaymentType } from "../../../types/enums";
import { widgetIds } from "../../../utils/constants/forms";
import { showLoadingToast } from "../../../utils/notifications";

export const generateColumns = (
  data,
  stripeProducts,
  handleMutation,
  setUpdatedField,
  rateupPaymentsPlanDelete,
) => {
  const handleDeleteClick = (id: GridRowId) => () => {
    rateupPaymentsPlanDelete.mutate(id);
    showLoadingToast(
      "Hold.. your data is getting deleted...",
      "load-data",
      true,
      "Deleting RateUp Plan",
    );
  };

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "Rateup_Plan_ID",
      width: 220,
      cellClassName: styles.idCell,
    },
    { field: "name", headerName: "Name", width: 200 },
    {
      field: "displayName",
      headerName: "Display Name",
      width: 150,
      editable: true,
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (params.hasChanged) {
          setUpdatedField(params.props.value);
        }
        return {
          ...params.props,
        };
      },
    },
    {
      field: "displayWidgetId",
      headerName: "Display_Widget_Id",
      width: 220,
      editable: true,
      type: "singleSelect",
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (params.hasChanged) {
          handleMutation({
            id: params.id,
            displayWidgetId:
              params.props.value === "Nil" ? null : params.props.value,
            paymentPlanId: params.row.paymentPlanId,
          });
        }
        return {
          ...params.props,
        };
      },
      valueOptions: widgetIds,
    },
    {
      field: "planType",
      headerName: "Plan Type",
      width: 100,
      editable: true,
      type: "singleSelect",
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (params.hasChanged) {
          handleMutation({
            id: params.id,
            planType: params.props.value,
            paymentPlanId: params.row.paymentPlanId,
          });
        }
        return {
          ...params.props,
        };
      },
      valueOptions: Object.values(PaymentType),
    },
    {
      field: "description",
      headerName: "Description",
      width: 150,

      // renderEditCell: (params) => {
      //   // toggleDescriptonModal()
      //   return <GridEditInputCell {...params} />;
      // },
    },
    {
      field: "paymentPlanId",
      headerName: "payment_plan",
      width: 220,
      cellClassName: styles.idCell,
      editable: true,
      type: "singleSelect",
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (params.hasChanged) {
          handleMutation({
            id: params.id,
            paymentPlanId: params.props.value,
          });
        }
        return {
          ...params.props,
        };
      },
      valueOptions: data ? [...data, null] : [],
    },
    {
      field: "stripeId",
      headerName: "Stripe Product",
      width: 220,
      cellClassName: styles.idCell,
      editable: true,
      type: "singleSelect",
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (params.hasChanged) {
          handleMutation({
            id: params.id,
            stripeId: params.props.value,
          });
        }
        return {
          ...params.props,
        };
      },
      valueOptions: stripeProducts ? [...stripeProducts, null] : [],
    },
    {
      field: "features",
      headerName: "Features",
      minWidth: 300,
      flex: 1,
      renderCell: renderFeatures,
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      cellClassName: "actions",
      getActions: ({ id }) => {
        return [
          <GridActionsCellItem
            icon={<IconTrash />}
            label="Delete"
            onClick={handleDeleteClick(id)}
            color="inherit"
            key={id + "delete-action"}
          />,
        ];
      },
    },
  ];
  return columns;
};
